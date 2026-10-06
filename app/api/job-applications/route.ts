import { connectDB } from '@/lib/mongodb';
import { JobPosting } from '@/models/JobPosting';
import { JobApplication } from '@/models/JobApplication';
import { Settings } from '@/models/Settings';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { sendJobApplicationEmails } from '@/lib/email';
import { deletePrivateDocument, uploadPrivateDocument } from '@/lib/cloudinary';
import {
  ANSWER_MAX,
  APPLICATION_STATUSES,
  COVER_LETTER_MAX,
  RESUME_EXTENSIONS,
  RESUME_MAX_BYTES,
  fileExtension,
  isAcceptingApplications,
  isHttpUrl,
  normalizeUrl,
  type ApplicationStatus,
  type FieldMode,
} from '@/lib/careers';

export const runtime = 'nodejs';

const ContactSchema = z.object({
  fullName: z.string().trim().min(2, 'Please share your full name').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(200),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine(v => (v.match(/\d/g) ?? []).length >= 7, 'Please enter a valid phone number'),
  location: z.string().trim().max(140).optional().default(''),
});

class ApplicationError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function text(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

function collect(mode: FieldMode, value: string, label: string) {
  if (mode === 'off') return '';
  if (mode === 'required' && !value) throw new ApplicationError(`${label} is required`);
  return value;
}

function collectUrl(mode: FieldMode, raw: string, label: string) {
  const value = collect(mode, normalizeUrl(raw), label);
  if (value && (!isHttpUrl(value) || value.length > 300)) {
    throw new ApplicationError(`Please enter a valid link for ${label.toLowerCase()}`);
  }
  return value;
}

// Checks the file's leading bytes, not just its name: PDF, legacy Word (OLE) and DOCX (zip).
function looksLikeDocument(buffer: Buffer, ext: string) {
  if (ext === 'pdf') return buffer.subarray(0, 5).toString('latin1') === '%PDF-';
  if (ext === 'doc') return buffer.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
  if (ext === 'docx') return buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  return false;
}

function safeFileName(name: string, ext: string) {
  const base = name
    .replace(/\.[^.]+$/, '')
    .replace(/[^\p{L}\p{N} ._-]+/gu, '')
    .trim()
    .slice(0, 80);
  return `${base || 'resume'}.${ext}`;
}

export async function POST(request: NextRequest) {
  let uploadedPublicId: string | null = null;

  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApplicationError('Your application could not be read. If you attached a large file, try a smaller one.');
    }

    // Honeypot — real applicants never see or fill this. Pretend success so bots learn nothing.
    if (text(form, 'website')) {
      return NextResponse.json({ success: true }, { status: 201 });
    }

    const jobId = text(form, 'jobId');
    if (!mongoose.isValidObjectId(jobId)) throw new ApplicationError('This role could not be found', 404);

    await connectDB();
    const job: any = await JobPosting.findById(jobId).lean();
    if (!job) throw new ApplicationError('This role could not be found', 404);
    if (!isAcceptingApplications(job)) {
      throw new ApplicationError('This role is no longer accepting applications', 410);
    }

    const contact = ContactSchema.safeParse({
      fullName: text(form, 'fullName'),
      email: text(form, 'email'),
      phone: text(form, 'phone'),
      location: text(form, 'location'),
    });
    if (!contact.success) throw new ApplicationError(contact.error.errors[0].message);
    const { fullName, email, phone, location } = contact.data;

    const fields = job.applicationFields ?? {};
    const coverLetter = collect(fields.coverLetter ?? 'off', text(form, 'coverLetter'), 'A cover letter');
    if (coverLetter.length > COVER_LETTER_MAX) {
      throw new ApplicationError(`Please keep your cover letter under ${COVER_LETTER_MAX} characters`);
    }
    const linkedin = collectUrl(fields.linkedin ?? 'off', text(form, 'linkedin'), 'LinkedIn profile');
    const portfolio = collectUrl(fields.portfolio ?? 'off', text(form, 'portfolio'), 'Portfolio');

    // Custom questions — validated against the role's current configuration, never the client's.
    let rawAnswers: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(text(form, 'answers') || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) rawAnswers = parsed;
    } catch {
      throw new ApplicationError('Your answers could not be read');
    }

    const answers = (job.questions ?? []).map((q: any) => {
      const raw = rawAnswers[q.id];
      const value = typeof raw === 'string' ? raw.trim() : '';
      if (q.required && !value) throw new ApplicationError(`Please answer: “${q.label}”`);
      if (value.length > ANSWER_MAX) throw new ApplicationError(`Please shorten your answer to “${q.label}”`);
      if (value && q.type === 'select' && !q.options.includes(value)) {
        throw new ApplicationError(`Please choose an option for “${q.label}”`);
      }
      if (value && q.type === 'yesno' && value !== 'Yes' && value !== 'No') {
        throw new ApplicationError(`Please answer yes or no to “${q.label}”`);
      }
      const finalValue = value && q.type === 'url' ? normalizeUrl(value) : value;
      if (finalValue && q.type === 'url' && !isHttpUrl(finalValue)) {
        throw new ApplicationError(`Please enter a valid link for “${q.label}”`);
      }
      return { questionId: q.id, label: q.label, type: q.type, value: finalValue };
    });

    // Résumé
    const resumeMode: FieldMode = fields.resume ?? 'off';
    const file = form.get('resume');
    const hasFile = file instanceof File && file.size > 0;
    if (resumeMode === 'required' && !hasFile) throw new ApplicationError('Please attach your résumé');

    let resume: { buffer: Buffer; fileName: string; ext: string } | null = null;
    if (resumeMode !== 'off' && hasFile) {
      const ext = fileExtension(file.name);
      if (!(RESUME_EXTENSIONS as readonly string[]).includes(ext)) {
        throw new ApplicationError('Your résumé should be a PDF or Word document');
      }
      if (file.size > RESUME_MAX_BYTES) throw new ApplicationError('Your résumé must be 4 MB or smaller');
      const buffer = Buffer.from(await file.arrayBuffer());
      if (!looksLikeDocument(buffer, ext)) {
        throw new ApplicationError('That file doesn’t look like a valid PDF or Word document');
      }
      resume = { buffer, fileName: safeFileName(file.name, ext), ext };
    }

    const normalizedEmail = email.toLowerCase();
    const alreadyApplied = () =>
      new ApplicationError('You’ve already applied for this role with this email. We’ll be in touch if there’s a fit.', 409);
    if (await JobApplication.exists({ job: job._id, email: normalizedEmail })) throw alreadyApplied();

    let storedResume;
    if (resume) {
      try {
        const uploaded = await uploadPrivateDocument(resume.buffer, 'applications', `${job.slug}-${randomUUID()}.${resume.ext}`);
        uploadedPublicId = uploaded.publicId;
        storedResume = { publicId: uploaded.publicId, fileName: resume.fileName, format: resume.ext, bytes: uploaded.bytes };
      } catch (err) {
        console.error('Résumé upload failed:', err);
        throw new ApplicationError('We couldn’t upload your résumé just now. Please try again in a moment.', 502);
      }
    }

    const application = await JobApplication.create({
      job: job._id,
      jobTitle: job.title,
      jobSlug: job.slug,
      fullName,
      email: normalizedEmail,
      phone,
      location: location || undefined,
      linkedin: linkedin || undefined,
      portfolio: portfolio || undefined,
      coverLetter: coverLetter || undefined,
      resume: storedResume,
      answers,
    }).catch((err: any) => {
      // A simultaneous double-submit slips past the pre-check; the unique index catches it here.
      throw err?.code === 11000 ? alreadyApplied() : err;
    });
    uploadedPublicId = null; // owned by the saved application from here on

    const settings: any = await Settings.findOne().select('partnershipEmail').lean();
    const adminEmail =
      process.env.CAREERS_EMAIL || process.env.ADMIN_EMAIL || settings?.partnershipEmail || 'rinwahospitality@gmail.com';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '');

    const emailResult = await sendJobApplicationEmails({
      application: { fullName, email: normalizedEmail, phone, location, linkedin, portfolio, coverLetter, answers },
      job: { title: job.title, department: job.department, location: job.location, type: job.type, workplace: job.workplace },
      resume: resume ? { fileName: resume.fileName, content: resume.buffer } : undefined,
      adminEmail,
      consoleUrl: siteUrl ? `${siteUrl}/admin/applications?id=${application._id}` : undefined,
    });
    if (!emailResult.sent) {
      console.warn('Application saved but email failed:', emailResult.warnings);
    }

    return NextResponse.json({ success: true, id: application._id }, { status: 201 });
  } catch (error) {
    if (uploadedPublicId) await deletePrivateDocument(uploadedPublicId);
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Job application error:', error);
    return NextResponse.json({ error: 'We couldn’t submit your application. Please try again.' }, { status: 500 });
  }
}

const STATUS_FILTERS = ['all', ...APPLICATION_STATUSES] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const limit = Math.min(10000, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const rawStatus = searchParams.get('status') as StatusFilter;
    const status: StatusFilter = STATUS_FILTERS.includes(rawStatus) ? rawStatus : 'all';
    const jobId = searchParams.get('job');
    const q = (searchParams.get('q') || '').trim().slice(0, 100);

    await connectDB();

    const base: Record<string, unknown> = {};
    if (jobId && mongoose.isValidObjectId(jobId)) base.job = new mongoose.Types.ObjectId(jobId);
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      base.$or = [{ fullName: rx }, { email: rx }];
    }
    const query = status === 'all' ? base : { ...base, status };

    const [total, grouped] = await Promise.all([
      JobApplication.countDocuments(query),
      JobApplication.aggregate<{ _id: ApplicationStatus; n: number }>([
        { $match: base },
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]),
    ]);

    const counts = Object.fromEntries(STATUS_FILTERS.map(s => [s, 0])) as Record<StatusFilter, number>;
    for (const g of grouped) {
      counts[g._id] = g.n;
      counts.all += g.n;
    }

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);
    const applications = await JobApplication.find(query)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ applications, total, limit, page: currentPage, totalPages, counts });
  } catch (error) {
    console.error('Job applications fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}

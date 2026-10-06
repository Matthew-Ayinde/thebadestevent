import { z } from 'zod';

// Client-safe careers constants, types and validation shared by the admin console,
// the public /careers pages and the API routes. Keep mongoose out of this file.

export const JOB_STATUSES = ['draft', 'open', 'closed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'] as const;
export const WORKPLACE_TYPES = ['On-site', 'Hybrid', 'Remote'] as const;

// How a standard application field is collected for a role.
export const FIELD_MODES = ['required', 'optional', 'off'] as const;
export type FieldMode = (typeof FIELD_MODES)[number];

export const QUESTION_TYPES = ['short', 'long', 'select', 'yesno', 'url'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short: 'Short answer',
  long: 'Long answer',
  select: 'Single choice',
  yesno: 'Yes / No',
  url: 'Link',
};

export const APPLICATION_STATUSES = ['new', 'reviewing', 'shortlisted', 'hired', 'rejected'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  shortlisted: 'Shortlisted',
  hired: 'Hired',
  rejected: 'Not progressing',
};

export const STANDARD_FIELDS = [
  { key: 'resume', label: 'Résumé / CV' },
  { key: 'coverLetter', label: 'Cover letter' },
  { key: 'linkedin', label: 'LinkedIn profile' },
  { key: 'portfolio', label: 'Portfolio / website' },
] as const;
export type StandardFieldKey = (typeof STANDARD_FIELDS)[number]['key'];

export const DEFAULT_APPLICATION_FIELDS: Record<StandardFieldKey, FieldMode> = {
  resume: 'required',
  coverLetter: 'optional',
  linkedin: 'optional',
  portfolio: 'off',
};

// Vercel caps serverless request bodies at 4.5 MB, so the whole multipart payload must fit under it.
export const RESUME_MAX_BYTES = 4 * 1024 * 1024;
export const RESUME_EXTENSIONS = ['pdf', 'doc', 'docx'] as const;
export const RESUME_ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const COVER_LETTER_MAX = 4000;
export const ANSWER_MAX = 2000;

export type JobQuestion = {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options: string[];
};

export type PublicJob = {
  id: string;
  slug: string;
  title: string;
  company: string;
  department: string;
  location: string;
  workplace: string;
  type: string;
  compensation?: string;
  overview: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  closingDate?: string;
  applicationFields: Record<StandardFieldKey, FieldMode>;
  questions: JobQuestion[];
  createdAt: string;
  updatedAt: string;
};

// ─── Validation ──────────────────────────────────────────────────────────────

const listItems = (max: number) =>
  z
    .array(z.string().trim().max(400))
    .max(max)
    .transform(items => items.filter(Boolean));

export const JobQuestionSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    label: z.string().trim().min(1, 'Every question needs a label').max(300),
    type: z.enum(QUESTION_TYPES),
    required: z.boolean(),
    options: z.array(z.string().trim().max(120)).max(20).default([]),
  })
  .transform(q => ({
    ...q,
    options: q.type === 'select' ? Array.from(new Set(q.options.filter(Boolean))) : [],
  }))
  .refine(q => q.type !== 'select' || q.options.length >= 2, {
    message: 'Single-choice questions need at least two options',
  });

export const JobPostingInputSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(140),
  company: z.string().trim().max(140).optional(),
  department: z.string().trim().max(80).default(''),
  location: z.string().trim().min(2, 'Location is required').max(140),
  workplace: z.enum(WORKPLACE_TYPES),
  type: z.enum(EMPLOYMENT_TYPES),
  compensation: z.string().trim().max(140).optional(),
  overview: z.string().trim().min(20, 'Overview should be at least a few sentences').max(5000),
  responsibilities: listItems(30).refine(a => a.length > 0, 'Add at least one responsibility'),
  requirements: listItems(30).refine(a => a.length > 0, 'Add at least one requirement'),
  niceToHave: listItems(30).default([]),
  status: z.enum(JOB_STATUSES),
  // yyyy-mm-dd from a date input, or empty to clear.
  closingDate: z
    .string()
    .trim()
    .refine(v => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Invalid closing date')
    .optional(),
  applicationFields: z.object({
    resume: z.enum(FIELD_MODES),
    coverLetter: z.enum(FIELD_MODES),
    linkedin: z.enum(FIELD_MODES),
    portfolio: z.enum(FIELD_MODES),
  }),
  questions: z
    .array(JobQuestionSchema)
    .max(15, 'Keep it to 15 custom questions or fewer')
    .refine(qs => new Set(qs.map(q => q.id)).size === qs.length, 'Duplicate question ids'),
  order: z.number().int().optional(),
});
export type JobPostingInput = z.infer<typeof JobPostingInputSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'role';
}

// Closing dates are inclusive: a role closing on the 30th accepts applications all day on the 30th (UTC).
export function closingDateEnd(closingDate: Date | string) {
  const d = new Date(closingDate);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

export function isAcceptingApplications(job: { status: string; closingDate?: Date | string | null }, now = new Date()) {
  if (job.status !== 'open') return false;
  if (job.closingDate && closingDateEnd(job.closingDate) < now) return false;
  return true;
}

// Mongo filter matching roles visible on the public careers pages.
export function openJobsFilter(now = new Date()) {
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return {
    status: 'open',
    $or: [{ closingDate: { $exists: false } }, { closingDate: null }, { closingDate: { $gte: startOfToday } }],
  };
}

export function formatClosingDate(closingDate?: string | Date | null) {
  if (!closingDate) return null;
  return new Date(closingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function toPublicJob(doc: any): PublicJob {
  const fields = doc.applicationFields ?? {};
  return {
    id: String(doc._id),
    slug: doc.slug,
    title: doc.title,
    company: doc.company || 'RÌNWÁ Hospitality & Experiences',
    department: doc.department || '',
    location: doc.location,
    workplace: doc.workplace || 'On-site',
    type: doc.type,
    compensation: doc.compensation || undefined,
    overview: doc.overview,
    responsibilities: doc.responsibilities ?? [],
    requirements: doc.requirements ?? [],
    niceToHave: doc.niceToHave ?? [],
    closingDate: doc.closingDate ? new Date(doc.closingDate).toISOString() : undefined,
    applicationFields: {
      resume: fields.resume ?? DEFAULT_APPLICATION_FIELDS.resume,
      coverLetter: fields.coverLetter ?? DEFAULT_APPLICATION_FIELDS.coverLetter,
      linkedin: fields.linkedin ?? DEFAULT_APPLICATION_FIELDS.linkedin,
      portfolio: fields.portfolio ?? DEFAULT_APPLICATION_FIELDS.portfolio,
    },
    questions: (doc.questions ?? []).map((q: any) => ({
      id: q.id,
      label: q.label,
      type: q.type,
      required: !!q.required,
      options: q.options ?? [],
    })),
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

export function fileExtension(name: string) {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toLowerCase() : '';
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Accepts "linkedin.com/in/x" as well as full URLs.
export function normalizeUrl(value: string) {
  const v = value.trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

// Maps validated admin input onto the stored document. Empty optional values are unset
// rather than stored as empty strings, so "no closing date" really means none.
export function toJobDocument(input: JobPostingInput) {
  const { closingDate, compensation, company, ...rest } = input;
  const set: Record<string, unknown> = { ...rest };
  const unset: Record<string, ''> = {};

  if (closingDate) set.closingDate = new Date(`${closingDate}T00:00:00.000Z`);
  else unset.closingDate = '';

  if (compensation) set.compensation = compensation;
  else unset.compensation = '';

  if (company) set.company = company;

  return { set, unset };
}

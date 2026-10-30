import { v2 as cloudinary } from 'cloudinary';
import { connectDB } from '@/lib/mongodb';
import { CLOUDINARY_ROOT_FOLDER, deleteCloudinaryAssets } from '@/lib/cloudinary';
import { CREDIT_OPTIONS, HomecomingStory, WALL_SIZE } from '@/models/HomecomingStory';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { linkVisitorIdentity } from '@/lib/analytics/identify';
import { rateLimit, RATE_LIMITS, tooManyRequests } from '@/lib/rate-limit';
import { rateLimitKey } from '@/lib/client-ip';

export const runtime = 'nodejs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// The browser shrinks photos before sending, so anything near this is unusual.
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const optionalText = (max: number) =>
  z.string().trim().max(max, `Please keep this under ${max} characters`).optional().transform(v => v || undefined);

const handle = optionalText(80).transform(v => v?.replace(/^@+/, '') || undefined);

const Schema = z
  .object({
    creditAs: z.enum(CREDIT_OPTIONS, {
      errorMap: () => ({ message: 'Please choose how you would like to be credited' }),
    }),
    name: optionalText(80),
    movedFrom: z.string().trim().min(1, 'Please tell us where you moved back from').max(120),
    story: z.string().trim().min(20, 'Please share a little more of your story').max(4000),
    yearReturned: z.coerce
      .number()
      .int()
      .min(1960, 'Please choose the year you returned')
      .max(new Date().getFullYear(), 'Please choose the year you returned'),
    instagram: handle,
    tiktok: handle,
    twitter: handle,
    linkedin: handle,
    wantsTag: z.boolean().optional().default(false),
    wishedHelpWith: optionalText(2000),
    wishPrepared: optionalText(2000),
    landingThoughts: optionalText(2000),
    contentConsent: z.boolean({ required_error: 'Please let us know if we can share your story' }),
  })
  .superRefine((d, ctx) => {
    if (d.creditAs !== 'Anonymous' && !d.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['name'],
        message: d.creditAs === 'Nickname' ? 'Please enter your nickname' : 'Please enter your full name',
      });
    }
    if (d.wantsTag && !d.instagram && !d.tiktok && !d.twitter && !d.linkedin) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['wantsTag'], message: 'Add a handle so we know where to tag you' });
    }
  })
  .transform(d => ({
    ...d,
    name: d.creditAs === 'Anonymous' ? undefined : d.name,
    // Tagging an anonymous storyteller would reveal who they are.
    wantsTag: d.creditAs !== 'Anonymous' && d.wantsTag,
  }));

function uploadPhoto(file: File): Promise<string> {
  return file.arrayBuffer().then(
    bytes =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `${CLOUDINARY_ROOT_FOLDER}/feedback`,
            resource_type: 'image',
            transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }],
          },
          (error, result) => {
            if (error || !result) reject(error ?? new Error('Upload failed'));
            else resolve(result.secure_url);
          }
        );
        stream.end(Buffer.from(bytes));
      })
  );
}

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(RATE_LIMITS.formSubmit, rateLimitKey(request.headers));
    if (!limited.ok) return tooManyRequests(limited, 'Too many submissions. Please wait a few minutes and try again.');

    const form = await request.formData();
    const raw = form.get('data');
    if (typeof raw !== 'string') {
      return NextResponse.json({ error: 'Missing form data', code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    const validated = Schema.parse(JSON.parse(raw));

    const photo = form.get('photo');
    let photoUrl: string | undefined;
    if (photo instanceof File && photo.size > 0) {
      if (!PHOTO_TYPES.includes(photo.type)) {
        return NextResponse.json({ error: 'Please upload a JPG, PNG or WebP photo', code: 'VALIDATION_ERROR' }, { status: 400 });
      }
      if (photo.size > MAX_PHOTO_BYTES) {
        return NextResponse.json({ error: 'That photo is too large, please pick a smaller one', code: 'VALIDATION_ERROR' }, { status: 400 });
      }
      photoUrl = await uploadPhoto(photo);
    }

    await connectDB();
    let submission;
    try {
      submission = await HomecomingStory.create({ ...validated, photoUrl });
    } catch (error) {
      await deleteCloudinaryAssets([photoUrl]);
      throw error;
    }

    await linkVisitorIdentity(request, {
      source: 'feedback',
      submissionId: String(submission._id),
      name: validated.name,
    });

    return NextResponse.json({ success: true, id: submission._id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message, code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid form data', code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    console.error('Homecoming story submission error:', error);
    return NextResponse.json({ error: 'Failed to submit your story' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

    await connectDB();
    const [total, featuredCount] = await Promise.all([
      HomecomingStory.countDocuments(),
      HomecomingStory.countDocuments({ featured: true }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);

    const submissions = await HomecomingStory.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((currentPage - 1) * limit);

    return NextResponse.json({ submissions, total, limit, page: currentPage, totalPages, featuredCount, wallSize: WALL_SIZE }, { status: 200 });
  } catch (error) {
    console.error('Homecoming story fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 });
  }
}

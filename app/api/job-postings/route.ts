import { connectDB } from '@/lib/mongodb';
import { JobPosting } from '@/models/JobPosting';
import { JobApplication } from '@/models/JobApplication';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { JobPostingInputSchema, openJobsFilter, toJobDocument, toPublicJob } from '@/lib/careers';
import { backfillLegacyJobs, uniqueSlug } from '@/lib/careers-server';

export const runtime = 'nodejs';

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return !!session && (session.user as any).role === 'admin';
}

// Public: open roles only. Admin (?scope=admin): every role plus application counts.
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const scope = request.nextUrl.searchParams.get('scope');

    if (scope === 'admin') {
      if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      await backfillLegacyJobs();
      const [jobs, counts] = await Promise.all([
        JobPosting.find().sort({ order: 1, createdAt: -1 }).lean(),
        JobApplication.aggregate<{ _id: unknown; total: number; fresh: number }>([
          { $group: { _id: '$job', total: { $sum: 1 }, fresh: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } } } },
        ]),
      ]);
      const byJob = new Map(counts.map(c => [String(c._id), c]));
      return NextResponse.json(
        jobs.map((job: any) => ({
          ...job,
          applicationCount: byJob.get(String(job._id))?.total ?? 0,
          newApplicationCount: byJob.get(String(job._id))?.fresh ?? 0,
        }))
      );
    }

    const jobs = await JobPosting.find(openJobsFilter()).sort({ order: 1, createdAt: -1 }).lean();
    return NextResponse.json(jobs.map(toPublicJob));
  } catch (error) {
    console.error('Error fetching job postings:', error);
    return NextResponse.json({ error: 'Failed to fetch job postings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const validated = JobPostingInputSchema.parse(await request.json());

    await connectDB();
    const { set } = toJobDocument(validated);

    // A concurrent create can grab the same slug between the lookup and the insert; retry once.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const created = await JobPosting.create({ ...set, slug: await uniqueSlug(validated.title) });
        return NextResponse.json(created, { status: 201 });
      } catch (err: any) {
        if (err?.code !== 11000 || attempt === 1) throw err;
      }
    }
    throw new Error('Unreachable');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Error creating job posting:', error);
    return NextResponse.json({ error: 'Failed to create job posting' }, { status: 500 });
  }
}

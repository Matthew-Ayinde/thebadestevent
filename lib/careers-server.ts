import { cache } from 'react';
import { connectDB } from '@/lib/mongodb';
import { JobPosting } from '@/models/JobPosting';
import { Settings } from '@/models/Settings';
import { isAcceptingApplications, openJobsFilter, slugify, toPublicJob, type PublicJob } from '@/lib/careers';

export async function getOpenJobs(): Promise<PublicJob[]> {
  await connectDB();
  const jobs = await JobPosting.find(openJobsFilter()).sort({ order: 1, createdAt: -1 }).lean();
  return jobs.map(toPublicJob);
}

// Drafts are invisible; closed roles still resolve so old links explain that the role has closed.
export const getJobBySlug = cache(async (slug: string): Promise<{ job: PublicJob; accepting: boolean } | null> => {
  await connectDB();
  const doc: any = await JobPosting.findOne({ slug, status: { $ne: 'draft' } }).lean();
  if (!doc) return null;
  return { job: toPublicJob(doc), accepting: isAcceptingApplications(doc) };
});

export const getCareersCopy = cache(async () => {
  await connectDB();
  // Roles on /careers belong to RÌNWÁ's partner companies, so this deliberately does not reuse
  // joinTeamDescription, which describes hiring for the RÌNWÁ team itself.
  const settings: any = await Settings.findOne().select('partnershipEmail').lean();
  return {
    description:
      'RÌNWÁ is a hospitality consultancy and talent advisory for the brands shaping how Africa eats, drinks, gathers and celebrates. We don’t just fill vacancies. We match the people who make experiences unforgettable with the teams who deserve them. Think of us as a bridge to your next move.',
    contactEmail: process.env.CAREERS_EMAIL || settings?.partnershipEmail || 'rinwahospitality@gmail.com',
  };
});

export async function uniqueSlug(title: string) {
  // slugify only emits [a-z0-9-], so the base is safe to embed in a pattern.
  const base = slugify(title);
  const taken = new Set(
    (await JobPosting.find({ slug: new RegExp(`^${base}(-\\d+)?$`) }).select('slug').lean()).map((j: any) => j.slug)
  );
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// Postings created before the careers rebuild have no slug or status. Give them a slug and park
// them as drafts so an admin can review and publish them. Idempotent and cheap once done.
export async function backfillLegacyJobs() {
  const legacy: any[] = await JobPosting.find({ slug: { $exists: false } }).select('title status').lean();
  for (const job of legacy) {
    await JobPosting.updateOne(
      { _id: job._id, slug: { $exists: false } },
      { $set: { slug: await uniqueSlug(job.title || 'role'), ...(job.status ? {} : { status: 'draft' }) } }
    );
  }
}

import type { Metadata } from 'next';
import { CareersBackdrop, CareersFooter, CareersTopBar } from '@/components/careers/CareersChrome';
import { CareersBoard } from '@/components/careers/CareersBoard';
import { getCareersCopy, getOpenJobs } from '@/lib/careers-server';

// Roles are published from the admin console and must appear (and close) immediately.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'Open roles at agencies and companies hiring through RÌNWÁ. Browse positions and apply in one place, with RÌNWÁ managing every application on the employer’s behalf.',
  alternates: { canonical: '/careers' },
  openGraph: {
    title: 'Open roles · RÌNWÁ Careers',
    description: 'Roles at agencies and companies hiring through RÌNWÁ.',
    url: '/careers',
  },
};

export default async function CareersPage() {
  const [jobs, copy] = await Promise.all([getOpenJobs(), getCareersCopy()]);

  return (
    <main className="relative min-h-screen overflow-x-clip">
      <CareersBackdrop />
      <div className="relative z-10">
        <CareersTopBar />
        <CareersBoard jobs={jobs} description={copy.description} contactEmail={copy.contactEmail} />
        <CareersFooter />
      </div>
    </main>
  );
}

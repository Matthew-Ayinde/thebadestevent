import type { Metadata } from 'next';
import { CareersBackdrop, CareersFooter, CareersTopBar } from '@/components/careers/CareersChrome';
import { CareersBoard } from '@/components/careers/CareersBoard';
import { HowItWorks, WhoWePlace, WhyRinwa } from '@/components/careers/CareersSections';
import { TalentCircle } from '@/components/careers/TalentCircleForm';
import { getCareersCopy, getOpenJobs } from '@/lib/careers-server';

// Roles are published from the admin console and must appear (and close) immediately.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'Hospitality and experience roles with the brands shaping how Africa eats, drinks, gathers and celebrates. Apply once, or join the RÌNWÁ talent circle to hear about roles before they’re posted.',
  alternates: { canonical: '/careers' },
  openGraph: {
    title: 'Open roles · RÌNWÁ Careers',
    description: 'You make the moment. We find the room. Hospitality roles curated by RÌNWÁ.',
    url: '/careers',
  },
};

export default async function CareersPage() {
  const [jobs, copy] = await Promise.all([getOpenJobs(), getCareersCopy()]);

  return (
    <main className="relative min-h-screen overflow-x-clip">
      <CareersBackdrop />
      <div className="relative z-10">
        <CareersTopBar sections />
        <CareersBoard jobs={jobs} description={copy.description} contactEmail={copy.contactEmail}>
          <WhoWePlace />
        </CareersBoard>
        <div className="mt-24 sm:mt-32">
          <HowItWorks />
        </div>
        <WhyRinwa />
        <TalentCircle />
        <CareersFooter contactEmail={copy.contactEmail} />
      </div>
    </main>
  );
}

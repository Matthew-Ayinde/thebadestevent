'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

interface JobPosting {
  id: string;
  slug: string;
  title: string;
  company: string;
  location: string;
  type: string;
  overview: string;
  responsibilities: string[];
  requirements: string[];
}

interface Settings {
  joinTeamDescription: string;
}

export function JoinTeamSection() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [jobsRes, settingsRes] = await Promise.all([
          fetch('/api/job-postings'),
          fetch('/api/settings'),
        ]);

        const jobsData = await jobsRes.json();
        const settingsData = await settingsRes.json();

        setJobs(Array.isArray(jobsData) ? jobsData : []);
        setSettings(settingsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (isLoading || jobs.length === 0) {
    return null;
  }

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-3xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl mb-4">
            Join Our Team
          </h2>
          <p className="text-foreground/70 text-lg leading-relaxed">
            {settings?.joinTeamDescription ||
              'As RÌNWÁ expands globally, we\'re building a team of thoughtful creatives, strategists, and cultural disruptors to help shape the future of culturally-driven hospitality and experiences.'}
          </p>
        </div>

        {/* Job Postings */}
        <div className="space-y-0">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="border-b border-foreground/10 last:border-b-0"
            >
              {/* Collapsible Header */}
              <button
                onClick={() =>
                  setExpandedId(expandedId === job.id ? null : job.id)
                }
                className="w-full text-left py-6 px-0 flex justify-between items-center group hover:opacity-80 transition-opacity"
              >
                <div className="flex-1">
                  <h3 className="font-serif text-xl md:text-2xl font-bold text-foreground/90 mb-2 group-hover:text-teal-soft transition-colors">
                    {job.title}
                  </h3>
                  <p className="text-foreground/60 text-sm space-x-3">
                    <span>{job.company}</span>
                    <span>•</span>
                    <span>{job.location}</span>
                    <span>•</span>
                    <span>{job.type}</span>
                  </p>
                </div>
                <ChevronDown
                  size={24}
                  className={`flex-shrink-0 text-teal-soft transition-transform duration-300 ml-4 ${
                    expandedId === job.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Expanded Content */}
              {expandedId === job.id && (
                <div className="pb-6 px-0 space-y-6 border-t border-foreground/5 pt-6 animate-in fade-in duration-300">
                  {/* Overview */}
                  <div>
                    <p className="text-foreground/80 leading-relaxed">
                      {job.overview}
                    </p>
                  </div>

                  {/* What You'll Do */}
                  <div>
                    <h4 className="font-semibold text-foreground/90 mb-3">
                      What You'll Do
                    </h4>
                    <ul className="space-y-2">
                      {job.responsibilities.map((resp, idx) => (
                        <li
                          key={idx}
                          className="flex gap-3 text-foreground/75 text-sm"
                        >
                          <span className="text-teal-soft mt-1">•</span>
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Who You Are */}
                  <div>
                    <h4 className="font-semibold text-foreground/90 mb-3">
                      Who You Are
                    </h4>
                    <ul className="space-y-2">
                      {job.requirements.map((req, idx) => (
                        <li
                          key={idx}
                          className="flex gap-3 text-foreground/75 text-sm"
                        >
                          <span className="text-teal-soft mt-1">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Apply Button */}
                  <div className="pt-4">
                    <Link
                      href={`/careers/${job.slug}`}
                      className="inline-block px-8 py-3 bg-foreground/10 hover:bg-foreground/15 border border-foreground/20 hover:border-teal-soft text-foreground/90 hover:text-teal-soft font-semibold rounded-full transition-all duration-300"
                    >
                      Apply Now
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

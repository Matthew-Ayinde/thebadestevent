import type { MetadataRoute } from "next";
import { getOpenJobs } from "@/lib/careers-server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // A database hiccup should never take the whole sitemap down.
  const jobs = await getOpenJobs().catch(() => []);

  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/careers`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...jobs.map(job => ({
      url: `${siteUrl}/careers/${job.slug}`,
      lastModified: new Date(job.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}

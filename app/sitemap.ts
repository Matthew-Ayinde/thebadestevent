import type { MetadataRoute } from "next";
import { getOpenJobs } from "@/lib/careers-server";
import { connectDB } from "@/lib/mongodb";
import { EventSite } from "@/models/EventSite";

async function getPublishedEventPages() {
  await connectDB();
  return EventSite.find({ isPublished: true }).select("slug updatedAt").limit(500).lean();
}

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // A database hiccup should never take the whole sitemap down.
  const [jobs, events] = await Promise.all([
    getOpenJobs().catch(() => []),
    getPublishedEventPages().catch(() => []),
  ]);

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
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date("2026-10-15"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    ...jobs.map(job => ({
      url: `${siteUrl}/careers/${job.slug}`,
      lastModified: new Date(job.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...events.map(event => ({
      url: `${siteUrl}/${event.slug}`,
      lastModified: new Date(event.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}

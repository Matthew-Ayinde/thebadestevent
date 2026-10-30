import type { Metadata } from "next";
import CameHome from "@/components/rinwa/CameHome";
import { connectDB } from "@/lib/mongodb";
import { HomecomingStory, toPublicStory, type IHomecomingStory, type PublicStory } from "@/models/HomecomingStory";

export const metadata: Metadata = {
  title: "Came Home Stories",
  description:
    "Stories from people who moved back home: what brought them back, what surprised them, and what they wish they'd known. Share yours with RÌNWÁ.",
};

// Featured stories change only when an admin features one, which revalidates
// this page; the timer is a backstop.
export const revalidate = 600;

const WALL_SIZE = 8;

async function featuredStories(): Promise<PublicStory[]> {
  try {
    await connectDB();
    const docs = await HomecomingStory.find({ featured: true, contentConsent: true })
      .sort({ updatedAt: -1 })
      .limit(WALL_SIZE);
    return docs.map((d: IHomecomingStory) => toPublicStory(d));
  } catch (error) {
    // The form should still work if the wall can't load.
    console.error("Failed to load featured stories:", error);
    return [];
  }
}

export default async function FeedbackPage() {
  return <CameHome stories={await featuredStories()} />;
}

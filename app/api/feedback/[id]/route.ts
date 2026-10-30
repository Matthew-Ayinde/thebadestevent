import { connectDB } from '@/lib/mongodb';
import { deleteCloudinaryAssets } from '@/lib/cloudinary';
import { HomecomingStory, WALL_SIZE } from '@/models/HomecomingStory';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return !!session && (session.user as any).role === 'admin';
}

const PatchSchema = z.object({
  featured: z.boolean(),
  // When the wall is full, take the longest-featured story off to make room.
  replaceOldest: z.boolean().optional(),
});

function creditName(s: { creditAs: string; name?: string }) {
  return s.creditAs === 'Anonymous' || !s.name ? 'Anonymous' : s.name;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { featured, replaceOldest } = PatchSchema.parse(await request.json());

    await connectDB();
    const story = await HomecomingStory.findById(id);
    if (!story) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (featured && !story.contentConsent) {
      return NextResponse.json({ error: 'This person did not consent to their story being shared' }, { status: 400 });
    }

    let replacedId: string | undefined;
    if (featured && !story.featured) {
      const onWall = await HomecomingStory.countDocuments({ featured: true });
      if (onWall >= WALL_SIZE) {
        // Stories featured before featuredAt existed sort first, i.e. as oldest.
        const oldest = await HomecomingStory.findOne({ featured: true }).sort({ featuredAt: 1, updatedAt: 1 });
        if (!replaceOldest) {
          return NextResponse.json(
            {
              error: `The wall holds ${WALL_SIZE} stories`,
              code: 'WALL_FULL',
              wallSize: WALL_SIZE,
              oldest: oldest && { id: String(oldest._id), name: creditName(oldest) },
            },
            { status: 409 }
          );
        }
        if (oldest) {
          oldest.featured = false;
          oldest.featuredAt = undefined;
          await oldest.save();
          replacedId = String(oldest._id);
        }
      }
    }

    if (story.featured !== featured) {
      story.featured = featured;
      story.featuredAt = featured ? new Date() : undefined;
      await story.save();
    }
    revalidatePath('/feedback');

    const featuredCount = await HomecomingStory.countDocuments({ featured: true });
    return NextResponse.json({ success: true, featured: story.featured, featuredCount, replacedId }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Homecoming story update error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();
    const result = await HomecomingStory.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await deleteCloudinaryAssets([result.photoUrl]);
    if (result.featured) revalidatePath('/feedback');

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Homecoming story delete error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

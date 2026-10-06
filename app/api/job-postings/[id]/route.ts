import { connectDB } from '@/lib/mongodb';
import { JobPosting } from '@/models/JobPosting';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { JOB_STATUSES, JobPostingInputSchema, toJobDocument } from '@/lib/careers';

export const runtime = 'nodejs';

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return !!session && (session.user as any).role === 'admin';
}

const notFound = () => NextResponse.json({ error: 'Job posting not found' }, { status: 404 });

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return notFound();

    const validated = JobPostingInputSchema.parse(await request.json());
    const { set, unset } = toJobDocument(validated);

    await connectDB();
    // The slug is deliberately left alone so shared links keep working after a title edit.
    const updated = await JobPosting.findByIdAndUpdate(
      id,
      { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { new: true, runValidators: true }
    );

    if (!updated) return notFound();
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Error updating job posting:', error);
    return NextResponse.json({ error: 'Failed to update job posting' }, { status: 500 });
  }
}

const StatusSchema = z.object({ status: z.enum(JOB_STATUSES) });

// Quick status change (publish / close) from the role list.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return notFound();

    const parsed = StatusSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await connectDB();
    const updated = await JobPosting.findByIdAndUpdate(id, { status: parsed.data.status }, { new: true });
    if (!updated) return notFound();
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating job posting status:', error);
    return NextResponse.json({ error: 'Failed to update job posting' }, { status: 500 });
  }
}

// Applications for a deleted role are kept: they carry a snapshot of the role title.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return notFound();

    await connectDB();
    const deleted = await JobPosting.findByIdAndDelete(id);
    if (!deleted) return notFound();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting job posting:', error);
    return NextResponse.json({ error: 'Failed to delete job posting' }, { status: 500 });
  }
}

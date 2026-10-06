import { connectDB } from '@/lib/mongodb';
import { JobApplication } from '@/models/JobApplication';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { deletePrivateDocument } from '@/lib/cloudinary';
import { APPLICATION_STATUSES } from '@/lib/careers';

export const runtime = 'nodejs';

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return !!session && (session.user as any).role === 'admin';
}

const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return notFound();

    await connectDB();
    const application = await JobApplication.findById(id).lean();
    if (!application) return notFound();
    return NextResponse.json(application);
  } catch (error) {
    console.error('Job application fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
  }
}

const UpdateSchema = z
  .object({
    status: z.enum(APPLICATION_STATUSES).optional(),
    notes: z.string().max(5000).optional(),
  })
  .refine(v => v.status !== undefined || v.notes !== undefined, 'Nothing to update');

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return notFound();

    const parsed = UpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    await connectDB();
    const updated = await JobApplication.findByIdAndUpdate(id, parsed.data, { new: true }).lean();
    if (!updated) return notFound();
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Job application update error:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return notFound();

    await connectDB();
    const deleted: any = await JobApplication.findByIdAndDelete(id).lean();
    if (!deleted) return notFound();
    if (deleted.resume?.publicId) await deletePrivateDocument(deleted.resume.publicId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Job application delete error:', error);
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 });
  }
}

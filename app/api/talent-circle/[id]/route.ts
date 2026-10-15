import { connectDB } from '@/lib/mongodb';
import { TalentCircleMember } from '@/models/TalentCircleMember';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';

export const runtime = 'nodejs';

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return !!session && (session.user as any).role === 'admin';
}

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });

const UpdateSchema = z.object({ isRead: z.boolean() });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdmin())) return unauthorized();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return notFound();

    const { isRead } = UpdateSchema.parse(await request.json());
    await connectDB();
    const member = await TalentCircleMember.findByIdAndUpdate(id, { $set: { isRead } }, { new: true }).lean();
    if (!member) return notFound();
    return NextResponse.json(member);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    console.error('Talent circle update error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdmin())) return unauthorized();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return notFound();

    await connectDB();
    const deleted = await TalentCircleMember.findByIdAndDelete(id);
    if (!deleted) return notFound();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Talent circle delete error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

import { connectDB } from '@/lib/mongodb';
import { ContactSubmission } from '@/models/ContactSubmission';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    await connectDB();
    const submission = await ContactSubmission.findById(id);

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Mark as read
    await ContactSubmission.findByIdAndUpdate(id, { isRead: true });

    return NextResponse.json(submission, { status: 200 });
  } catch (error) {
    console.error('Error fetching submission:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submission', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    await connectDB();
    const submission = await ContactSubmission.findByIdAndDelete(id);

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting submission:', error);
    return NextResponse.json(
      { error: 'Failed to delete submission', code: 'DELETE_ERROR' },
      { status: 500 }
    );
  }
}

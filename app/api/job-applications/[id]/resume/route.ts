import { connectDB } from '@/lib/mongodb';
import { JobApplication } from '@/models/JobApplication';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { privateDocumentUrl } from '@/lib/cloudinary';

export const runtime = 'nodejs';

// Admin-only: redirects to a short-lived signed link for the applicant's privately stored résumé.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await connectDB();
    const application: any = await JobApplication.findById(id).select('resume').lean();
    if (!application?.resume?.publicId) {
      return NextResponse.json({ error: 'No résumé on file' }, { status: 404 });
    }

    const response = NextResponse.redirect(privateDocumentUrl(application.resume.publicId));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Résumé download error:', error);
    return NextResponse.json({ error: 'Failed to prepare download' }, { status: 500 });
  }
}

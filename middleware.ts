import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = await auth();

  // Check if user is trying to access /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Optional: Check for specific role (admin only)
    if (!(session.user as any).role === 'admin' && !(session.user as any).role === 'editor') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

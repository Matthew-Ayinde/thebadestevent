import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';


const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(body);

    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'New password must be different from current password' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(session.user.id).select('+password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isCurrentValid = await user.comparePassword(currentPassword);

    if (!isCurrentValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    user.password = newPassword;
    user.resetCode = undefined;
    user.resetExpires = undefined;
    user.resetVerifiedUntil = undefined;

    await user.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}

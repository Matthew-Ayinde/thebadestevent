import { NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { sendEmail } from '@/lib/email';
import { rateLimit, RATE_LIMITS, tooManyRequests } from '@/lib/rate-limit';
import { rateLimitKey } from '@/lib/client-ip';

export async function POST(req: Request) {
  try {
    const limited = await rateLimit(RATE_LIMITS.resetRequest, rateLimitKey(req.headers));
    if (!limited.ok) return tooManyRequests(limited, 'Too many reset requests. Please wait 15 minutes and try again.');

    const { email } = await req.json();
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';

    if (!normalizedEmail) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    await connectDB();

    const user = await User.findOne({ email: normalizedEmail });

    // Security: don't reveal whether the email exists
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = await bcryptjs.hash(code, 10);

    user.resetCode = hashed;
    user.resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    user.resetVerifiedUntil = undefined;

    await user.save();

    const subject = 'Your password reset code';
    const html = `<div style="font-family:Arial,sans-serif;color:#07171a;padding:20px"><h2>Your verification code</h2><p style="font-size:20px;font-weight:700">${code}</p><p>This code will expire in 15 minutes.</p></div>`;

    const result = await sendEmail({ to: user.email, subject, html });

    return NextResponse.json({ ok: true, sent: result.sent, warnings: result.warnings });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

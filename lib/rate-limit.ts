import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { RateLimit } from '@/models/RateLimit';

export interface RateLimitRule {
  /** Short name for the thing being limited, e.g. "collect" or "login". */
  scope: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export const RATE_LIMITS = {
  collect: { scope: 'collect', limit: 300, windowSeconds: 60 },
  formSubmit: { scope: 'form', limit: 10, windowSeconds: 10 * 60 },
  login: { scope: 'login', limit: 10, windowSeconds: 15 * 60 },
  loginAccount: { scope: 'login-account', limit: 20, windowSeconds: 15 * 60 },
  resetRequest: { scope: 'reset-request', limit: 5, windowSeconds: 15 * 60 },
  resetVerify: { scope: 'reset-verify', limit: 10, windowSeconds: 15 * 60 },
} satisfies Record<string, RateLimitRule>;

/**
 * Counts a hit against `key` in the current fixed window. Backed by MongoDB so
 * limits hold across serverless instances. Fails open: if the counter store is
 * unreachable the request is allowed, so an outage never locks users out.
 */
export async function rateLimit(rule: RateLimitRule, key: string): Promise<RateLimitResult> {
  const windowMs = rule.windowSeconds * 1000;
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowEnd = windowStart + windowMs;

  try {
    await connectDB();
    const doc = await RateLimit.findOneAndUpdate(
      { _id: `${rule.scope}:${key}:${windowStart}` },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowEnd + 60_000) } },
      { upsert: true, new: true, lean: true }
    );
    const count = (doc as { count?: number } | null)?.count ?? 1;
    return {
      ok: count <= rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil((windowEnd - now) / 1000)),
    };
  } catch (error) {
    console.error(`Rate limiter unavailable (${rule.scope}):`, error);
    return { ok: true, remaining: rule.limit, retryAfterSeconds: 0 };
  }
}

export function tooManyRequests(result: RateLimitResult, message = 'Too many requests. Please try again shortly.') {
  return NextResponse.json(
    { error: message, code: 'RATE_LIMITED' },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } }
  );
}

export function minutesUntil(result: RateLimitResult) {
  return Math.max(1, Math.ceil(result.retryAfterSeconds / 60));
}

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import {
  addDays,
  autoInterval,
  daysBetween,
  isDateString,
  isValidTimeZone,
  startOfDayInZone,
  todayInZone,
  type Interval,
} from './dates';

export const MAX_RANGE_DAYS = 3 * 366;

export interface ParsedRange {
  from: string;
  to: string;
  tz: string;
  interval: Interval;
  start: Date;
  end: Date;
}

/** Visitor-level data contains personal details, so only admins may read it. */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }
  return null;
}

export function parseRange(request: NextRequest): ParsedRange | NextResponse {
  const params = request.nextUrl.searchParams;
  const tz = isValidTimeZone(params.get('tz')) ? params.get('tz')! : 'UTC';
  const today = todayInZone(tz);
  const to = isDateString(params.get('to')) ? params.get('to')! : today;
  const from = isDateString(params.get('from')) ? params.get('from')! : addDays(to, -29);

  if (from > to) {
    return NextResponse.json({ error: '"from" must be on or before "to"', code: 'BAD_RANGE' }, { status: 400 });
  }
  if (daysBetween(from, to) > MAX_RANGE_DAYS) {
    return NextResponse.json({ error: 'Range is limited to 3 years', code: 'BAD_RANGE' }, { status: 400 });
  }

  const requested = params.get('interval');
  const interval: Interval = requested === 'day' || requested === 'month' ? requested : autoInterval(from, to);

  return {
    from,
    to,
    tz,
    interval,
    start: startOfDayInZone(from, tz),
    end: startOfDayInZone(addDays(to, 1), tz),
  };
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

import type { NextRequest } from 'next/server';
import { AnalyticsVisitor } from '@/models/AnalyticsVisitor';
import { readVisitorId } from './request-context';
import { getClientIp } from '@/lib/client-ip';
import { CONSENT_COOKIE, CONSENT_VERSION } from '@/lib/consent';

interface IdentityInput {
  source: string;
  submissionId?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
}

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 200) : undefined;
}

// Links details a visitor typed into a site form to their anonymous analytics
// profile. Never throws: analytics must not break a form submission.
export async function linkVisitorIdentity(request: NextRequest, input: IdentityInput) {
  try {
    // Only link details for visitors who accepted analytics cookies.
    const consent = decodeURIComponent(request.cookies.get(CONSENT_COOKIE)?.value ?? '');
    const visitorId = readVisitorId(request);
    if (!visitorId || consent !== `${CONSENT_VERSION}:all`) return;

    const now = new Date();
    const set: Record<string, unknown> = {};
    const name = clean(input.name);
    const email = clean(input.email)?.toLowerCase();
    const phone = clean(input.phone);
    const company = clean(input.company);
    if (name) set.name = name;
    if (email) set.email = email;
    if (phone) set.phone = phone;
    if (company) set.company = company;
    if (Object.keys(set).length === 0) return;
    const ip = getClientIp(request.headers);
    if (ip) set.ip = ip;

    await AnalyticsVisitor.updateOne(
      { visitorId },
      {
        $set: set,
        $min: { identifiedAt: now, consentAt: now },
        ...(ip ? { $addToSet: { ipAddresses: ip } } : {}),
        $push: {
          identitySources: {
            $each: [{ source: input.source, submissionId: input.submissionId, at: now }],
            $slice: -50,
          },
        },
        $setOnInsert: { firstSeen: now, lastSeen: now, sessions: 0, pageviews: 0 },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Failed to link analytics identity:', error);
  }
}

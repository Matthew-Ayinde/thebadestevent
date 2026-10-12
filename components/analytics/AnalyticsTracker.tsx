'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const ENDPOINT = '/api/analytics/collect';
// Staff-only surfaces are not audience traffic.
const EXCLUDED = [/^\/admin(\/|$)/, /^\/hotel-medallion\/scan(\/|$)/];
// Paths that embed a secret (ticket links work as bearer tokens) are recorded as a pattern.
const REDACTED: [RegExp, string][] = [[/^\/hotel-medallion\/ticket\/[^/]+/, '/hotel-medallion/ticket/[token]']];

function redact(pathname: string) {
  for (const [re, replacement] of REDACTED) if (re.test(pathname)) return { path: pathname.replace(re, replacement), redacted: true };
  return { path: pathname, redacted: false };
}

interface ActivePage {
  id: string | null;
  engagedMs: number;
  visibleSince: number | null;
  maxScroll: number;
}

function scrollPercent() {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 100;
  return Math.min(100, Math.round((window.scrollY / scrollable) * 100));
}

function send(payload: object) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon?.(ENDPOINT, body)) return;
  fetch(ENDPOINT, { method: 'POST', body, keepalive: true, credentials: 'same-origin' }).catch(() => {});
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const page = useRef<ActivePage | null>(null);
  const firstLoad = useRef(true);

  // Flushes engagement for the page being left. Safe to call repeatedly; values are cumulative.
  function flush() {
    const p = page.current;
    if (!p?.id) return;
    const engagedMs = p.engagedMs + (p.visibleSince ? Date.now() - p.visibleSince : 0);
    send({ t: 'leave', id: p.id, engagedMs: Math.min(engagedMs, 30 * 60 * 1000), scrollDepth: p.maxScroll });
  }

  useEffect(() => {
    if (!pathname || EXCLUDED.some((re) => re.test(pathname))) return;
    if ((navigator as Navigator & { webdriver?: boolean }).webdriver) return;

    const current: ActivePage = {
      id: null,
      engagedMs: 0,
      visibleSince: document.visibilityState === 'visible' ? Date.now() : null,
      maxScroll: scrollPercent(),
    };
    page.current = current;

    const params = new URLSearchParams(window.location.search);
    const { path, redacted } = redact(pathname);
    const payload = {
      t: 'pv',
      path,
      title: redacted ? undefined : document.title,
      // document.referrer is only meaningful on the first, full page load of a visit.
      referrer: firstLoad.current ? document.referrer : undefined,
      utmSource: params.get('utm_source') ?? undefined,
      utmMedium: params.get('utm_medium') ?? undefined,
      utmCampaign: params.get('utm_campaign') ?? undefined,
      utmTerm: params.get('utm_term') ?? undefined,
      utmContent: params.get('utm_content') ?? undefined,
      screen: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      touch: navigator.maxTouchPoints > 1,
    };
    firstLoad.current = false;

    let cancelled = false;
    // Give the new route a moment to set its <title>.
    const timer = window.setTimeout(() => {
      if (!redacted) payload.title = document.title;
      fetch(ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: 'same-origin',
      })
        .then((res) => (res.status === 200 ? res.json() : null))
        .then((data) => {
          if (!cancelled && data?.id) current.id = data.id;
        })
        .catch(() => {});
    }, 300);

    function onScroll() {
      const pct = scrollPercent();
      if (pct > current.maxScroll) current.maxScroll = pct;
    }

    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        if (current.visibleSince) current.engagedMs += Date.now() - current.visibleSince;
        current.visibleSince = null;
        flush();
      } else {
        current.visibleSince = Date.now();
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [pathname]);

  return null;
}

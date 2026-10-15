'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { CONSENT_EVENT, type ConsentChoice } from '@/lib/consent';

const ENDPOINT = '/api/analytics/collect';
// Staff-only surfaces are not audience traffic.
const EXCLUDED = [/^\/admin(\/|$)/, /^\/hotel-medallion\/scan(\/|$)/];
// Paths that embed a secret (ticket links work as bearer tokens) are recorded as a pattern.
const REDACTED: [RegExp, string][] = [[/^\/hotel-medallion\/ticket\/[^/]+/, '/hotel-medallion/ticket/[token]']];
const SOCIAL_HOSTS = /(^|\.)(instagram|facebook|tiktok|x|twitter|youtube|linkedin|threads|snapchat|pinterest)\.com$|^youtu\.be$/;

function redact(pathname: string) {
  for (const [re, replacement] of REDACTED) if (re.test(pathname)) return { path: pathname.replace(re, replacement), redacted: true };
  return { path: pathname, redacted: false };
}

interface ActivePage {
  id: string | null;
  path: string;
  engagedMs: number;
  visibleSince: number | null;
  maxScroll: number;
  payload: Record<string, unknown>;
}

/** Scroll depth of whichever element scrolled: the window, or an inner full-height container. */
function scrollPercent(target?: EventTarget | null) {
  const el = target instanceof Element ? target : document.documentElement;
  const scrollable = el.scrollHeight - el.clientHeight;
  if (scrollable <= 0) return el === document.documentElement ? 100 : 0;
  return Math.min(100, Math.round((el.scrollTop / scrollable) * 100));
}

function send(payload: object) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon?.(ENDPOINT, body)) return;
  fetch(ENDPOINT, { method: 'POST', body, keepalive: true, credentials: 'same-origin' }).catch(() => {});
}

function postForId(payload: object): Promise<string | null> {
  return fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(payload), keepalive: true, credentials: 'same-origin' })
    .then((res) => (res.status === 200 ? res.json() : null))
    .then((data) => data?.id ?? null)
    .catch(() => null);
}

/** Contact links, socials, outbound links and anything tagged data-track="…". */
function describeClick(target: EventTarget | null): { kind: string; target: string; label: string } | null {
  if (!(target instanceof Element)) return null;
  const label = (el: Element) => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);

  const tagged = target.closest('[data-track]');
  if (tagged) return { kind: 'cta', target: tagged.getAttribute('data-track')!.slice(0, 200), label: label(tagged) };

  const link = target.closest('a[href]') as HTMLAnchorElement | null;
  if (!link) return null;
  const href = link.href;
  if (href.startsWith('tel:')) return { kind: 'phone', target: href.slice(4, 60), label: label(link) };
  if (href.startsWith('mailto:')) return { kind: 'email', target: href.slice(7).split('?')[0].slice(0, 200), label: label(link) };
  if (href.startsWith('whatsapp:')) return { kind: 'whatsapp', target: 'whatsapp', label: label(link) };

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.host === location.host) return null;
  const host = url.hostname.replace(/^www\./, '');
  const kind = /^(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)$/.test(host) ? 'whatsapp' : SOCIAL_HOSTS.test(host) ? 'social' : 'outbound';
  return { kind, target: `${host}${url.pathname === '/' ? '' : url.pathname}`.slice(0, 200), label: label(link) };
}

/**
 * First-party analytics for the public site. The server decides what is kept: with cookie consent
 * it sets the visitor/session cookies and builds a profile; without it, page views are counted
 * anonymously and no cookies are set.
 */
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

    const { path, redacted } = redact(pathname);
    const params = new URLSearchParams(window.location.search);
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    const payload: Record<string, unknown> = {
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
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      connection: connection?.effectiveType,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      touch: navigator.maxTouchPoints > 1,
    };
    firstLoad.current = false;

    const current: ActivePage = {
      id: null,
      path,
      engagedMs: 0,
      visibleSince: document.visibilityState === 'visible' ? Date.now() : null,
      maxScroll: scrollPercent(),
      payload,
    };
    page.current = current;

    let cancelled = false;
    // Give the new route a moment to set its <title>.
    const timer = window.setTimeout(() => {
      if (!redacted) payload.title = document.title;
      postForId(payload).then((id) => {
        if (!cancelled && id) current.id = id;
      });
    }, 300);

    function onScroll(e: Event) {
      const pct = scrollPercent(e.target === document ? null : e.target);
      if (pct > current.maxScroll) current.maxScroll = pct;
    }

    function onClick(e: MouseEvent) {
      const click = describeClick(e.target);
      if (click) send({ t: 'click', pageviewId: current.id ?? undefined, path, ...click });
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

    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    document.addEventListener('click', onClick, { capture: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener('scroll', onScroll, { capture: true });
      document.removeEventListener('click', onClick, { capture: true });
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [pathname]);

  // Accepting cookies mid-page upgrades the current anonymous page view (no double count).
  useEffect(() => {
    function onConsent(e: Event) {
      if ((e as CustomEvent<ConsentChoice>).detail !== 'all') return;
      const current = page.current;
      if (!current?.id) return;
      postForId({ ...current.payload, upgradeId: current.id });
    }
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  return null;
}

'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CONSENT_EVENT, readConsent, type ConsentChoice } from '@/lib/consent';

const VISITOR_COOKIE = 'rw_vid';
const SESSION_KEY = 'rw_session';
const SESSION_IDLE_MS = 30 * 60 * 1000;
const ENDPOINT = '/api/analytics/collect';

const SOCIAL_HOSTS = /(^|\.)(instagram|facebook|tiktok|x|twitter|youtube|linkedin|threads|snapchat|pinterest)\.com$|^youtu\.be$/;

function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function getVisitorId() {
  const existing = document.cookie.match(new RegExp(`(?:^|; )${VISITOR_COOKIE}=([^;]+)`))?.[1];
  const visitorId = existing || uid();
  // Refresh on every visit so the id lives a year past the last visit.
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${VISITOR_COOKIE}=${visitorId}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`;
  return visitorId;
}

function getSession(): { sessionId: string; isNew: boolean } {
  const now = Date.now();
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (stored?.id && now - stored.lastActive < SESSION_IDLE_MS) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ id: stored.id, lastActive: now }));
      return { sessionId: stored.id, isNew: false };
    }
    const id = uid();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, lastActive: now }));
    return { sessionId: id, isNew: true };
  } catch {
    return { sessionId: uid(), isNew: true };
  }
}

function send(payload: Record<string, unknown>, beacon = false) {
  const body = JSON.stringify(payload);
  if (beacon && navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
    return;
  }
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

/** Classifies a click worth reporting: contact links, socials, outbound links and tagged CTAs. */
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
  const kind = /^(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)$/.test(host)
    ? 'whatsapp'
    : SOCIAL_HOSTS.test(host)
      ? 'social'
      : 'outbound';
  return { kind, target: `${host}${url.pathname === '/' ? '' : url.pathname}`.slice(0, 200), label: label(link) };
}

function deviceContext() {
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return {
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    connection: connection?.effectiveType,
  };
}

/**
 * First-party analytics for the public site (never the admin console).
 * With cookie consent: a persistent visitor id, sessions and a full profile.
 * Without it: cookieless, storage-free page counts only.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<ConsentChoice | null | undefined>(undefined);
  // Survives consent changes so the current page is never counted twice.
  const page = useRef({ path: '', pageviewId: '', engagedMs: 0, maxScroll: 0 });

  useEffect(() => {
    setConsent(readConsent());
    const onChange = (e: Event) => setConsent((e as CustomEvent<ConsentChoice>).detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (consent === undefined || !pathname || pathname.startsWith('/admin')) return;

    const full = consent === 'all';
    let identity: { visitorId?: string; sessionId?: string; isNewSession?: boolean } = {};
    if (full) {
      const { sessionId, isNew } = getSession();
      identity = { visitorId: getVisitorId(), sessionId, isNewSession: isNew };
    }
    const isNewPage = page.current.path !== pathname;
    if (isNewPage) page.current = { path: pathname, pageviewId: uid(), engagedMs: 0, maxScroll: 0 };
    const { pageviewId } = page.current;
    const params = new URLSearchParams(location.search);
    const utm = (key: string) => params.get(`utm_${key}`)?.slice(0, 200) || undefined;

    // Accepting cookies mid-page upgrades the anonymous view instead of adding one.
    if (isNewPage || full) send({
      type: 'pageview',
      pageviewId,
      upgrade: !isNewPage,
      ...identity,
      path: pathname,
      title: document.title.slice(0, 300),
      referrer: document.referrer.slice(0, 1000) || undefined,
      utmSource: utm('source'),
      utmMedium: utm('medium'),
      utmCampaign: utm('campaign'),
      utmTerm: utm('term'),
      utmContent: utm('content'),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      screen: `${window.screen.width}x${window.screen.height}`,
      ...(full ? deviceContext() : {}),
    });

    // Engaged time counts only while the tab is visible.
    let visibleSince: number | null = document.visibilityState === 'visible' ? Date.now() : null;

    // Pages may scroll the window or an inner full-height container, so read
    // whichever element fired the (captured) scroll event.
    const onScroll = (e: Event) => {
      const el = e.target instanceof Element ? e.target : document.documentElement;
      const scrollable = el.scrollHeight - el.clientHeight;
      if (scrollable < 50) return;
      const pct = (el.scrollTop / scrollable) * 100;
      page.current.maxScroll = Math.max(page.current.maxScroll, Math.min(100, Math.round(pct)));
    };

    const onClick = (e: MouseEvent) => {
      const click = describeClick(e.target);
      if (click) send({ type: 'click', pageviewId, ...identity, path: pathname, ...click }, true);
    };

    const flush = () => {
      if (visibleSince !== null) {
        page.current.engagedMs += Date.now() - visibleSince;
        visibleSince = null;
      }
      const { engagedMs, maxScroll } = page.current;
      if (engagedMs > 0) {
        send({ type: 'engagement', pageviewId, visitorId: identity.visitorId, durationMs: engagedMs, maxScroll }, true);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      } else {
        visibleSince = Date.now();
        if (full) getSession();
      }
    };

    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    document.addEventListener('click', onClick, { capture: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);

    return () => {
      flush();
      document.removeEventListener('scroll', onScroll, { capture: true });
      document.removeEventListener('click', onClick, { capture: true });
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [pathname, consent]);

  return null;
}

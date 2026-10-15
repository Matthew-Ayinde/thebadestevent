// Cookie-consent state shared by the banner, the tracker, the privacy page and the server.
// "all"       → analytics cookies + full visitor profile (incl. IP address)
// "essential" → no analytics cookies; only anonymous, cookieless page counts
// null        → not decided yet; treated like "essential" until they choose

export type ConsentChoice = 'all' | 'essential';

export const CONSENT_COOKIE = 'rw_consent';
export const CONSENT_VERSION = '1';
export const CONSENT_EVENT = 'rw:consent-change';
export const OPEN_CONSENT_EVENT = 'rw:open-consent';

/** Server-side check: did this request's browser accept analytics cookies? */
export function consentFromCookie(value: string | undefined): ConsentChoice | null {
  if (!value) return null;
  let raw = value;
  try {
    raw = decodeURIComponent(value);
  } catch {
    // Keep the raw value.
  }
  const [version, choice] = raw.split(':');
  if (version !== CONSENT_VERSION) return null;
  return choice === 'all' || choice === 'essential' ? choice : null;
}

export function readConsent(): ConsentChoice | null {
  if (typeof document === 'undefined') return null;
  return consentFromCookie(document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]+)`))?.[1]);
}

export function writeConsent(choice: ConsentChoice) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  const value = encodeURIComponent(`${CONSENT_VERSION}:${choice}`);
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax${secure}`;

  // The visitor/session cookies are httpOnly, so only the server can remove them.
  if (choice === 'essential') {
    fetch('/api/analytics/collect', {
      method: 'POST',
      body: JSON.stringify({ t: 'optout' }),
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {});
  }

  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}

export function openConsentSettings() {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}

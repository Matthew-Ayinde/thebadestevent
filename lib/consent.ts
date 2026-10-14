// Cookie-consent state shared by the banner, the tracker and the privacy page.
// "all"       → analytics cookie + full visitor profile (incl. IP address)
// "essential" → no analytics cookie; only anonymous, cookieless page counts
// null        → not decided yet; treated like "essential" until they choose

export type ConsentChoice = 'all' | 'essential';

export const CONSENT_COOKIE = 'rw_consent';
export const CONSENT_VERSION = '1';
export const CONSENT_EVENT = 'rw:consent-change';
export const OPEN_CONSENT_EVENT = 'rw:open-consent';

const ANALYTICS_COOKIES = ['rw_vid'];
const ANALYTICS_STORAGE = ['rw_session'];

export function readConsent(): ConsentChoice | null {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]+)`))?.[1];
  if (!raw) return null;
  const [version, choice] = decodeURIComponent(raw).split(':');
  if (version !== CONSENT_VERSION) return null;
  return choice === 'all' || choice === 'essential' ? choice : null;
}

export function writeConsent(choice: ConsentChoice) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  const value = encodeURIComponent(`${CONSENT_VERSION}:${choice}`);
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax${secure}`;

  if (choice === 'essential') {
    for (const name of ANALYTICS_COOKIES) document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    try {
      for (const key of ANALYTICS_STORAGE) localStorage.removeItem(key);
    } catch {
      // Storage may be blocked; nothing to clear then.
    }
  }

  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}

export function openConsentSettings() {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}

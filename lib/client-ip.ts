type HeaderSource = Headers | Record<string, string | string[] | undefined> | undefined;

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-fA-F:.]{2,45}$/;

function getHeader(headers: HeaderSource, name: string): string | undefined {
  if (!headers) return undefined;
  if (typeof (headers as Headers).get === 'function') return (headers as Headers).get(name) ?? undefined;
  const value = (headers as Record<string, string | string[] | undefined>)[name];
  return Array.isArray(value) ? value[0] : value;
}

function normalise(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let ip = raw.split(',')[0].trim();
  // Strip an IPv4 port ("1.2.3.4:5678") and the IPv4-mapped IPv6 prefix.
  if (/^[\d.]+:\d+$/.test(ip)) ip = ip.split(':')[0];
  ip = ip.replace(/^::ffff:/i, '');
  return IPV4.test(ip) || (ip.includes(':') && IPV6.test(ip)) ? ip : undefined;
}

/**
 * The visitor's IP as reported by the hosting edge. Vercel and Cloudflare
 * overwrite these headers, so on those hosts they can't be spoofed by clients.
 */
export function getClientIp(headers: HeaderSource): string | undefined {
  return (
    normalise(getHeader(headers, 'x-vercel-forwarded-for')) ||
    normalise(getHeader(headers, 'cf-connecting-ip')) ||
    normalise(getHeader(headers, 'x-real-ip')) ||
    normalise(getHeader(headers, 'x-forwarded-for'))
  );
}

/** A stable rate-limit key even when no IP header is present (e.g. local dev). */
export function rateLimitKey(headers: HeaderSource) {
  return getClientIp(headers) ?? 'unknown';
}

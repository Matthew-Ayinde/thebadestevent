const numberFmt = new Intl.NumberFormat('en-US');
const compactFmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export function formatNumber(n: number) {
  return n >= 100_000 ? compactFmt.format(n) : numberFmt.format(Math.round(n));
}

export function formatPercent(ratio: number) {
  return `${Math.round(ratio * 1000) / 10}%`;
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/** Relative change; null when there is no baseline to compare against. */
export function change(current: number, previous: number): number | null {
  if (!previous) return null;
  return (current - previous) / previous;
}

export function formatBucket(key: string, interval: 'day' | 'month', style: 'short' | 'long' = 'short') {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d || 1));
  if (interval === 'month') {
    return date.toLocaleDateString('en-US', { month: style === 'long' ? 'long' : 'short', year: 'numeric', timeZone: 'UTC' });
  }
  return date.toLocaleDateString('en-US', {
    weekday: style === 'long' ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
    year: style === 'long' ? 'numeric' : undefined,
    timeZone: 'UTC',
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateTime(iso).split(',').slice(0, 2).join(',');
}

export const SOURCE_LABELS: Record<string, string> = {
  contact: 'Contact form',
  questionnaire: 'Event questionnaire',
  homecoming: 'Homecoming',
  'guest-experience': 'Guest check-in',
};

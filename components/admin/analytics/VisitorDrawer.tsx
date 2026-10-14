'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Cookie, Loader, MousePointerClick, Trash2, X } from 'lucide-react';
import type { VisitorClick, VisitorDetail, VisitorEvent } from '@/lib/analytics/types';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';
import { DeviceIcon } from './VisitorsTable';
import { formatDateTime, formatDuration, formatNumber, SOURCE_LABELS } from './format';

const CLICK_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  phone: 'Call',
  email: 'Email',
  social: 'Social',
  outbound: 'Link',
  cta: 'Button',
};

function Field({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.66rem] uppercase tracking-[0.12em] text-white/35">{label}</dt>
      <dd className={`mt-0.5 break-words text-sm text-white/85 ${mono ? 'font-mono text-[0.8rem]' : ''}`}>
        {value === undefined || value === null || value === '' ? '—' : value}
      </dd>
    </div>
  );
}

function groupBySession(events: VisitorEvent[]) {
  const sessions: { id: string; events: VisitorEvent[] }[] = [];
  for (const e of events) {
    const last = sessions[sessions.length - 1];
    if (last && last.id === e.sessionId) last.events.push(e);
    else sessions.push({ id: e.sessionId, events: [e] });
  }
  return sessions;
}

interface Props {
  visitorId: string | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function VisitorDrawer({ visitorId, onClose, onDeleted }: Props) {
  const [data, setData] = useState<VisitorDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!visitorId) return;
    const controller = new AbortController();
    setData(null);
    setError(null);
    fetch(`/api/analytics/visitors/${visitorId}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Failed to load visitor');
        return res.json();
      })
      .then(setData)
      .catch((err) => err.name !== 'AbortError' && setError(err.message));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      controller.abort();
      document.removeEventListener('keydown', onKey);
    };
  }, [visitorId, onClose]);

  async function handleDelete() {
    if (!visitorId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/analytics/visitors/${visitorId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Failed to delete');
      toast.success('Visitor data deleted');
      setConfirmDelete(false);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  if (!visitorId) return null;
  const v = data?.visitor;
  const clicksByPageview = new Map<string, VisitorClick[]>();
  for (const c of data?.clicks ?? []) {
    if (!c.pageviewId) continue;
    clicksByPageview.set(c.pageviewId, [...(clicksByPageview.get(c.pageviewId) ?? []), c]);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Visitor profile"
        className="relative flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#07171a] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div className="min-w-0">
            <p className="text-[0.66rem] uppercase tracking-[0.2em] text-teal-300/60">Visitor profile</p>
            <h2 className="mt-1 truncate font-serif text-2xl text-white/90">
              {v ? v.name || v.email || v.phone || (v.consent ? 'Anonymous visitor' : 'Cookieless visitor') : 'Loading…'}
            </h2>
            {v && <p className="mt-0.5 truncate font-mono text-[11px] text-white/30">{v.visitorId}</p>}
          </div>
          <div className="flex shrink-0 gap-2">
            {v && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete visitor data"
                title="Delete all analytics data for this visitor"
                className="rounded-lg border border-red-400/20 bg-red-500/10 p-2 text-red-300/80 transition hover:bg-red-500/20 hover:text-red-200"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              autoFocus
              aria-label="Close"
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && <p className="py-10 text-center text-sm text-rose-300">{error}</p>}
          {!data && !error && <Loader className="mx-auto mt-16 h-6 w-6 animate-spin text-teal-300/70" />}

          {v && data && (
            <div className="space-y-6">
              {!v.consent && (
                <p className="flex gap-2.5 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3.5 py-3 text-xs leading-relaxed text-amber-100/80">
                  <Cookie size={15} className="mt-px shrink-0" />
                  This visitor didn&apos;t accept analytics cookies, so only anonymous page counts are kept: no IP
                  address, no profile, and their visits can&apos;t be linked across days.
                </p>
              )}

              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Visits', formatNumber(v.sessions)],
                  ['Page views', formatNumber(v.pageviews)],
                  ['Time on site', formatDuration(v.totalMs)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-[0.66rem] uppercase tracking-[0.12em] text-white/40">{label}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-white/90">{value}</p>
                  </div>
                ))}
              </div>

              {v.consent && (
                <section>
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-white/50">Identity</h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="Name" value={v.name} />
                    <Field label="Email" value={v.email} />
                    <Field label="Phone" value={v.phone} />
                    <Field label="Company" value={v.company} />
                    <Field label="First identified" value={v.identifiedAt ? formatDateTime(v.identifiedAt) : undefined} />
                    <Field label="Forms submitted" value={v.identitySources?.map((s) => SOURCE_LABELS[s] ?? s).join(', ')} />
                    <Field label="Cookies accepted" value={v.consentAt ? formatDateTime(v.consentAt) : undefined} />
                  </dl>
                  {!v.name && !v.email && !v.phone && (
                    <p className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/40">
                      This visitor hasn&apos;t submitted a form yet. Their details will appear here once they do.
                    </p>
                  )}
                </section>
              )}

              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-white/50">Network & location</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label="IP address" value={v.ip} mono />
                  <Field
                    label="Other IPs seen"
                    value={v.ipAddresses?.filter((ip) => ip !== v.ip).join(', ')}
                    mono
                  />
                  <Field
                    label="Location"
                    value={
                      [v.city, v.region, v.country].filter(Boolean).length
                        ? `${[v.city, v.region, v.country].filter(Boolean).join(', ')}${v.countryCode ? ` (${v.countryCode})` : ''}`
                        : undefined
                    }
                  />
                  <Field label="Timezone" value={v.timezone} />
                  <Field label="Language" value={v.language} />
                  <Field label="Connection" value={v.connection?.toUpperCase()} />
                </dl>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-white/50">Device</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field
                    label="Device"
                    value={[v.deviceType && v.deviceType[0].toUpperCase() + v.deviceType.slice(1), v.deviceModel]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                  <Field label="Browser" value={v.browser} />
                  <Field label="Operating system" value={[v.os, v.osVersion].filter(Boolean).join(' ')} />
                  <Field label="Screen · window" value={[v.screen, v.viewport].filter(Boolean).join(' · ').replace(/x/g, ' × ')} />
                  <Field label="Appearance" value={v.colorScheme && `${v.colorScheme[0].toUpperCase()}${v.colorScheme.slice(1)} mode`} />
                </dl>
                {v.userAgent && (
                  <details className="mt-3 text-xs text-white/40">
                    <summary className="cursor-pointer select-none hover:text-white/60">Raw user agent</summary>
                    <p className="mt-1.5 break-all rounded-lg bg-white/[0.03] px-3 py-2 font-mono text-[11px] text-white/55">
                      {v.userAgent}
                    </p>
                  </details>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-white/50">Acquisition</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label="First seen" value={v.firstSeen ? formatDateTime(v.firstSeen) : undefined} />
                  <Field label="Last seen" value={v.lastSeen ? formatDateTime(v.lastSeen) : undefined} />
                  <Field label="First landing page" value={v.firstLandingPath} />
                  <Field label="Referred by" value={v.firstReferrerHost ?? 'Direct / none'} />
                  <Field label="UTM source" value={v.firstUtmSource} />
                  <Field label="UTM campaign" value={v.firstUtmCampaign} />
                </dl>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-white/50">
                  Activity <span className="normal-case tracking-normal text-white/30">· most recent first</span>
                </h3>
                {data.events.length === 0 ? (
                  <p className="text-sm text-white/35">No page views recorded.</p>
                ) : (
                  <ol className="space-y-4">
                    {groupBySession(data.events).map((session) => {
                      const first = session.events[session.events.length - 1];
                      return (
                        <li key={session.id + first.pageviewId} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/45">
                            <DeviceIcon type={first.deviceType} size={13} />
                            <span>{formatDateTime(first.createdAt)}</span>
                            {(first.city || first.country) && (
                              <span>· {[first.city, first.country].filter(Boolean).join(', ')}</span>
                            )}
                            {first.ip && <span className="font-mono">· {first.ip}</span>}
                            {first.referrerHost && <span>· from {first.referrerHost}</span>}
                            {first.utmSource && <span>· utm: {first.utmSource}</span>}
                          </div>
                          <ul className="space-y-1">
                            {[...session.events].reverse().map((e) => (
                              <li key={e.pageviewId}>
                                <div className="flex items-baseline justify-between gap-3 text-sm">
                                  <span className="truncate text-white/80" title={e.title}>
                                    {e.path}
                                  </span>
                                  <span className="shrink-0 text-xs tabular-nums text-white/40">
                                    {e.durationMs ? formatDuration(e.durationMs) : '—'}
                                    {e.maxScroll ? ` · ${e.maxScroll}% read` : ''}
                                  </span>
                                </div>
                                {clicksByPageview.get(e.pageviewId)?.map((c, i) => (
                                  <p key={i} className="ml-3 mt-0.5 flex items-center gap-1.5 truncate text-xs text-teal-200/70">
                                    <MousePointerClick size={12} className="shrink-0" />
                                    <span className="font-medium">{CLICK_LABELS[c.kind] ?? c.kind}</span>
                                    <span className="truncate text-white/45">{c.label || c.target}</span>
                                  </p>
                                ))}
                              </li>
                            ))}
                          </ul>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            </div>
          )}
        </div>
      </aside>

      <ConfirmationDialog
        isOpen={confirmDelete}
        title="Delete this visitor's data?"
        message="This permanently removes their profile, page views and clicks from analytics. Their form submissions are kept. Use this for erasure requests."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        isLoading={deleting}
      />
    </div>
  );
}

'use client';

import { ReactNode, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Laptop,
  MapPin,
  Search,
  Smartphone,
  Tablet,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import { CONVERSION_LABELS, flagUrl, fmtDateTime, fmtDuration, fmtNumber, fmtRelative } from './format';

const PAGE_SIZE = 25;

export function Flag({ code, className = '' }: { code?: string; className?: string }) {
  const src = flagUrl(code);
  if (!src) return <span className={`inline-block h-3 w-[18px] rounded-[2px] bg-white/10 ${className}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={18} height={12} className={`inline-block h-3 w-[18px] rounded-[2px] object-cover ${className}`} />;
}

export function DeviceIcon({ device, size = 14 }: { device?: string; size?: number }) {
  if (device === 'Mobile') return <Smartphone size={size} />;
  if (device === 'Tablet') return <Tablet size={size} />;
  return <Laptop size={size} />;
}

function place(v: { city?: string; region?: string; country?: string }) {
  return [v.city, v.country].filter(Boolean).join(', ') || 'Unknown location';
}

function formsOf(v: any): string[] {
  return [...new Set<string>((v.identities ?? []).map((i: any) => i.source))].map((s) => CONVERSION_LABELS[s] ?? s);
}

export function Avatar({ visitor, size = 'sm' }: { visitor: any; size?: 'sm' | 'lg' }) {
  const dims = size === 'lg' ? 'h-12 w-12 text-base' : 'h-8 w-8 text-xs';
  const initials = visitor.name
    ?.split(/\s+/)
    .map((p: string) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${dims} ${
        visitor.email ? 'bg-teal-300/15 text-teal-100 border border-teal-300/30' : 'bg-white/6 text-white/40 border border-white/10'
      }`}
    >
      {initials || <UserRound size={size === 'lg' ? 20 : 14} />}
    </span>
  );
}

/* ---------------------------------------- Table ---------------------------------------- */

export function VisitorsTable({ from, to, tz }: { from: string; to: string; tz: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [identifiedOnly, setIdentifiedOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => setPage(1), [from, to, debounced, identifiedOnly]);

  const params = new URLSearchParams({ from, to, tz, q: debounced, identified: identifiedOnly ? '1' : '0' });

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/analytics/visitors?${params}&page=${page}&limit=${PAGE_SIZE}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        setRows(data.visitors);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch(() => !cancelled && toast.error('Failed to load visitors'))
      .finally(() => !cancelled && setIsLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, tz, debounced, identifiedOnly, page, reload]);

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.03]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 p-5 sm:p-6">
        <div>
          <h2 className="text-sm font-medium text-white/90">People</h2>
          <p className="mt-0.5 text-xs text-white/40">
            {fmtNumber(total)} {identifiedOnly ? 'identified ' : ''}visitor{total === 1 ? '' : 's'} active in this period · names and emails come from forms they submitted
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, email, city, IP…"
              aria-label="Search visitors"
              className="w-56 rounded-xl border border-white/12 bg-white/5 py-2 pl-9 pr-3 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-teal-300/50"
            />
          </div>
          <div className="flex rounded-xl border border-white/12 bg-white/5 p-0.5 text-sm" role="group" aria-label="Visitor filter">
            {[
              [false, 'Everyone'],
              [true, 'Identified'],
            ].map(([val, label]) => (
              <button
                key={String(val)}
                onClick={() => setIdentifiedOnly(val as boolean)}
                aria-pressed={identifiedOnly === val}
                className={`rounded-lg px-3 py-1.5 transition ${identifiedOnly === val ? 'bg-teal-300/15 text-teal-100' : 'text-white/55 hover:text-white/85'}`}
              >
                {label as string}
              </button>
            ))}
          </div>
          <a
            href={`/api/analytics/visitors?${params}&format=csv`}
            className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white/75 hover:bg-white/8 hover:text-white transition"
          >
            <Download size={15} />
            CSV
          </a>
        </div>
      </header>

      <div className={`overflow-x-auto transition-opacity ${isLoading && rows.length ? 'opacity-50' : ''}`}>
        {isLoading && !rows.length ? (
          <div className="py-12"><LoadingSpinner /></div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-white/35">No visitors match these filters</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[0.68rem] uppercase tracking-[0.16em] text-white/40">
                <th className="px-5 py-3 font-medium">Visitor</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Device</th>
                <th className="px-5 py-3 font-medium">First source</th>
                <th className="px-5 py-3 font-medium text-right">Visits</th>
                <th className="px-5 py-3 font-medium text-right">Pages</th>
                <th className="px-5 py-3 font-medium text-right">Time</th>
                <th className="px-5 py-3 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr
                  key={v.visitorId}
                  onClick={() => setSelected(v.visitorId)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected(v.visitorId))}
                  tabIndex={0}
                  className="cursor-pointer border-t border-white/5 hover:bg-white/[0.04] focus:bg-white/[0.05] focus:outline-none"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3 min-w-[12rem]">
                      <Avatar visitor={v} />
                      <div className="min-w-0">
                        <p className="truncate text-white/90">{v.name || (v.email ? v.email : 'Anonymous visitor')}</p>
                        <p className="truncate text-xs text-teal-300/70">
                          {v.email || <span className="text-white/30 font-mono">{v.visitorId.slice(0, 8)}</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-white/75">
                    <Flag code={v.countryCode} className="mr-2 align-[-1px]" />
                    {place(v)}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-white/65">
                    <span className="inline-flex items-center gap-1.5">
                      <DeviceIcon device={v.device} />
                      {[v.browser, v.os].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-white/65">{v.firstSource || v.firstUtmSource || v.firstReferrerHost || 'Direct'}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-white/80">{fmtNumber(v.sessions)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-white/80">{fmtNumber(v.pageviews)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-white/60">{fmtDuration(v.totalEngagedMs)}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-white/55" title={fmtDateTime(v.lastSeenAt)}>{fmtRelative(v.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <footer className="flex items-center justify-between border-t border-white/8 px-5 py-3 text-sm text-white/55">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              className="rounded-lg border border-white/10 p-2 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
              className="rounded-lg border border-white/10 p-2 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      )}

      {selected && (
        <VisitorDrawer
          visitorId={selected}
          onClose={() => setSelected(null)}
          onOpen={setSelected}
          onDeleted={() => {
            setSelected(null);
            setReload((n) => n + 1);
          }}
        />
      )}
    </section>
  );
}

/* ---------------------------------------- Drawer --------------------------------------- */

function Field({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.66rem] uppercase tracking-[0.16em] text-white/35">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-white/85">{children || <span className="text-white/30">—</span>}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-white/8 px-6 py-5">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-teal-300/70">{title}</h3>
      {children}
    </section>
  );
}

interface SessionGroup {
  id: string;
  start: string;
  source?: string;
  events: any[];
}

function groupSessions(events: any[]): SessionGroup[] {
  const map = new Map<string, SessionGroup>();
  // Events arrive newest-first; build sessions oldest-first, then reverse for display.
  for (const e of [...events].reverse()) {
    let g = map.get(e.sessionId);
    if (!g) {
      g = { id: e.sessionId, start: e.createdAt, events: [] };
      map.set(e.sessionId, g);
    }
    if (e.isNewSession && !g.source) g.source = e.source;
    g.events.push(e);
  }
  return [...map.values()].reverse();
}

function VisitorDrawer({
  visitorId,
  onClose,
  onOpen,
  onDeleted,
}: {
  visitorId: string;
  onClose: () => void;
  onOpen: (id: string) => void;
  onDeleted: () => void;
}) {
  const [data, setData] = useState<{ visitor: any; events: any[]; otherDevices: any[] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    fetch(`/api/analytics/visitors/${visitorId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((d) => !cancelled && setData(d))
      .catch(() => {
        if (cancelled) return;
        toast.error('Failed to load visitor');
        onClose();
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !confirmDelete && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, confirmDelete]);

  async function erase() {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/analytics/visitors/${visitorId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Visitor and their activity deleted');
      onDeleted();
    } catch {
      toast.error('Failed to delete visitor');
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  }

  const v = data?.visitor;
  const sessions = data ? groupSessions(data.events) : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Visitor profile">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#081a1d] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-[#081a1d]/95 px-6 py-4 backdrop-blur">
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-white/40">Visitor profile</p>
          <div className="flex items-center gap-1">
            {v && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg p-2 text-red-300/80 hover:bg-red-600/15 hover:text-red-300 transition"
                aria-label="Delete visitor data"
                title="Delete this visitor and all their activity"
              >
                <Trash2 size={17} />
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/8 hover:text-white transition" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {!v ? (
          <div className="py-24"><LoadingSpinner /></div>
        ) : (
          <>
            <div className="flex items-center gap-4 px-6 py-6">
              <Avatar visitor={v} size="lg" />
              <div className="min-w-0">
                <h2 className="truncate font-serif text-2xl text-white/90">{v.name || (v.email ? v.email : 'Anonymous visitor')}</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/55">
                  <MapPin size={13} />
                  {place(v)}
                  <span className="text-white/25">·</span>
                  last seen {fmtRelative(v.lastSeenAt)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-px border-t border-white/8 bg-white/8">
              {[
                ['Visits', fmtNumber(v.sessions)],
                ['Pageviews', fmtNumber(v.pageviews)],
                ['Time on site', fmtDuration(v.totalEngagedMs)],
                ['Conversions', fmtNumber(v.conversions)],
              ].map(([label, value]) => (
                <div key={label} className="bg-[#081a1d] px-4 py-3">
                  <p className="text-[0.62rem] uppercase tracking-[0.14em] text-white/35">{label}</p>
                  <p className="mt-0.5 text-lg text-white/90">{value}</p>
                </div>
              ))}
            </div>

            <Section title="Identity">
              {v.email ? (
                <dl className="grid grid-cols-2 gap-4">
                  <Field label="Name">{v.name}</Field>
                  <Field label="Email">
                    <a href={`mailto:${v.email}`} className="text-teal-200 hover:underline">{v.email}</a>
                  </Field>
                  <Field label="Phone">{v.phone}</Field>
                  <Field label="Identified">{v.identifiedAt && fmtDateTime(v.identifiedAt)}</Field>
                  <div className="col-span-2">
                    <Field label="Forms submitted">
                      {formsOf(v).length > 0 && (
                        <span className="flex flex-wrap gap-1.5 pt-0.5">
                          {formsOf(v).map((f) => (
                            <span key={f} className="rounded-full border border-teal-300/25 bg-teal-300/10 px-2.5 py-0.5 text-xs text-teal-100">{f}</span>
                          ))}
                        </span>
                      )}
                    </Field>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-white/45">
                  Anonymous — this visitor hasn&apos;t submitted a form yet. Their profile fills in automatically if they do.
                </p>
              )}
            </Section>

            <Section title="Location">
              <dl className="grid grid-cols-2 gap-4">
                <Field label="City">{v.city}</Field>
                <Field label="Region">{v.region}</Field>
                <Field label="Country">
                  {v.country && (
                    <span className="inline-flex items-center gap-2"><Flag code={v.countryCode} />{v.country}</span>
                  )}
                </Field>
                <Field label="Postal code">{v.postalCode}</Field>
                <Field label="Timezone">{v.timezone}</Field>
                <Field label="IP address"><span className="font-mono text-xs">{v.ip}</span></Field>
                {v.ipAddresses?.filter((ip: string) => ip !== v.ip).length > 0 && (
                  <Field label="Other IPs seen">
                    <span className="font-mono text-xs">{v.ipAddresses.filter((ip: string) => ip !== v.ip).join(', ')}</span>
                  </Field>
                )}
                {v.latitude != null && v.longitude != null && (
                  <div className="col-span-2">
                    <Field label="Approx. coordinates">
                      <a
                        href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-teal-200 hover:underline"
                      >
                        {v.latitude.toFixed(3)}, {v.longitude.toFixed(3)} <ExternalLink size={12} />
                      </a>
                      <span className="ml-2 text-xs text-white/35">IP-based, city-level accuracy</span>
                    </Field>
                  </div>
                )}
              </dl>
            </Section>

            <Section title="Device & browser">
              <dl className="grid grid-cols-2 gap-4">
                <Field label="Device">
                  <span className="inline-flex items-center gap-1.5"><DeviceIcon device={v.device} />{v.device}</span>
                </Field>
                <Field label="Model">{v.deviceModel}</Field>
                <Field label="Browser">{[v.browser, v.browserVersion].filter(Boolean).join(' ')}</Field>
                <Field label="Operating system">{[v.os, v.osVersion].filter(Boolean).join(' ')}</Field>
                <Field label="Screen · window">{[v.screen, v.viewport].filter(Boolean).join(' · ')}</Field>
                <Field label="Connection">{v.connection?.toUpperCase()}</Field>
                <Field label="Appearance">{v.colorScheme && `${v.colorScheme[0].toUpperCase()}${v.colorScheme.slice(1)} mode`}</Field>
                <Field label="Language">{v.language}</Field>
                <Field label="Cookies accepted">{v.consentAt ? fmtDateTime(v.consentAt) : undefined}</Field>
                <div className="col-span-2">
                  <Field label="User agent"><span className="font-mono text-[0.7rem] text-white/55">{v.userAgent}</span></Field>
                </div>
              </dl>
            </Section>

            <Section title="Acquisition">
              <dl className="grid grid-cols-2 gap-4">
                <Field label="First seen">{fmtDateTime(v.firstSeenAt)}</Field>
                <Field label="First source">{v.firstSource || v.firstUtmSource || v.firstReferrerHost || 'Direct'}</Field>
                <Field label="Campaign">{[v.firstUtmCampaign, v.firstUtmMedium].filter(Boolean).join(' · ')}</Field>
                <Field label="Landing page"><span className="font-mono text-xs">{v.firstLandingPage}</span></Field>
                {v.firstReferrer && (
                  <div className="col-span-2">
                    <Field label="Referring URL"><span className="text-xs text-white/60">{v.firstReferrer}</span></Field>
                  </div>
                )}
              </dl>
            </Section>

            {data!.otherDevices.length > 0 && (
              <Section title="Same person on other devices">
                <ul className="space-y-1.5">
                  {data!.otherDevices.map((o) => (
                    <li key={o.visitorId}>
                      <button
                        onClick={() => onOpen(o.visitorId)}
                        className="flex w-full items-center justify-between rounded-lg border border-white/8 px-3 py-2 text-left text-sm hover:bg-white/5"
                      >
                        <span className="inline-flex items-center gap-2 text-white/80">
                          <DeviceIcon device={o.device} />
                          {[o.browser, o.os].filter(Boolean).join(' · ')} — {place(o)}
                        </span>
                        <span className="text-xs text-white/40">{fmtRelative(o.lastSeenAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title={`Journey · ${sessions.length} visit${sessions.length === 1 ? '' : 's'}`}>
              {sessions.length === 0 ? (
                <p className="text-sm text-white/40">No recorded activity.</p>
              ) : (
                <ol className="space-y-5">
                  {sessions.map((s) => (
                    <li key={s.id}>
                      <div className="mb-2 flex items-baseline justify-between gap-3">
                        <p className="text-sm text-white/85">{fmtDateTime(s.start)}</p>
                        <p className="text-xs text-white/40">
                          via {s.source ?? 'Direct'} · {s.events.filter((e) => e.type === 'pageview').length} pages
                        </p>
                      </div>
                      <ol className="relative ml-1.5 space-y-2 border-l border-white/10 pl-4">
                        {s.events.map((e) => (
                          <li key={e._id} className="relative">
                            <span
                              className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ring-2 ring-[#081a1d] ${
                                e.type === 'conversion' ? 'bg-amber-300' : 'bg-teal-400/70'
                              }`}
                            />
                            {e.type === 'conversion' ? (
                              <p className="text-sm text-amber-100">
                                Submitted {CONVERSION_LABELS[e.name] ?? e.name}
                                <span className="ml-2 text-xs text-white/35">
                                  {new Date(e.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </p>
                            ) : (
                              <div className="flex items-baseline justify-between gap-3">
                                <p className="min-w-0 truncate text-sm text-white/75" title={e.title}>
                                  <span className="font-mono text-xs text-white/85">{e.path}</span>
                                </p>
                                <p className="shrink-0 text-xs tabular-nums text-white/35">
                                  {new Date(e.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                  {e.engagedMs > 0 && ` · ${fmtDuration(e.engagedMs)}`}
                                  {e.scrollDepth > 0 && ` · ${e.scrollDepth}% read`}
                                </p>
                              </div>
                            )}
                          </li>
                        ))}
                      </ol>
                    </li>
                  ))}
                </ol>
              )}
              {data!.events.length >= 500 && <p className="mt-4 text-xs text-white/35">Showing the most recent 500 events.</p>}
            </Section>
          </>
        )}
      </aside>

      <ConfirmationDialog
        isOpen={confirmDelete}
        title="Delete this visitor?"
        message="This permanently erases their profile and every recorded pageview and conversion. Use it for data-deletion requests. Their form submissions elsewhere in the console are not affected."
        onConfirm={erase}
        onCancel={() => setConfirmDelete(false)}
        isLoading={isDeleting}
      />
    </div>
  );
}

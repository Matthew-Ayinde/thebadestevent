'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Copy, Edit2, ExternalLink, Plus, ScanLine, Trash2, Users } from 'lucide-react';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import { eventStatus, formatEventWhen, themeTokens, type EventSiteView } from '@/lib/event-site';

type Row = EventSiteView & { registered: number; checkedIn: number };

const STATUS_STYLES = {
  upcoming: 'bg-teal-300/10 text-teal-200 border-teal-300/30',
  live: 'bg-green-400/10 text-green-300 border-green-400/30',
  past: 'bg-white/5 text-white/45 border-white/10',
} as const;

export default function EventPagesAdmin() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/event-pages', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load event pages');
      setRows(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load event pages');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/event-pages/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      toast.success('Event page deleted');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  }

  const now = new Date();

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.32em] text-teal-300/60 mb-2">Microsites</p>
          <h1 className="font-serif text-4xl text-white/90">Event pages</h1>
          <p className="text-white/50 mt-2 max-w-2xl">
            Each event gets its own branded page at <span className="font-mono text-white/70">/your-event-url</span>, with
            RSVPs, QR tickets, door check-in and a recap once it’s over.
          </p>
        </div>
        <Link
          href="/admin/event-pages/new"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-teal-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-200"
        >
          <Plus size={18} />
          New event page
        </Link>
      </div>

      {rows === null ? (
        <LoadingSpinner />
      ) : rows.length === 0 ? (
        <div className="rounded-[1.8rem] border border-dashed border-white/15 p-12 text-center">
          <p className="font-serif text-xl text-white/80">No event pages yet</p>
          <p className="mt-1 text-sm text-white/45">Create one to give an event its own branded page and RSVP flow.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((e) => {
            const status = eventStatus(e, now);
            const k = themeTokens(e.theme);
            return (
              <li key={e.id} className="flex flex-col gap-4 rounded-[1.4rem] border border-white/10 bg-white/5 p-4 lg:flex-row lg:items-center">
                {/* Theme swatch doubles as a thumbnail. */}
                <div
                  className="flex h-20 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 lg:w-32"
                  style={{ background: `linear-gradient(160deg, ${k.navy}, ${k.ink})` }}
                >
                  {e.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.logoUrl} alt="" className="h-12 w-12 object-contain" />
                  ) : (
                    <span className="font-serif text-sm uppercase tracking-[0.2em]" style={{ color: k.cream }}>
                      {e.brandWordmark.slice(0, 12)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-[0.16em] ${STATUS_STYLES[status]}`}>{status}</span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-[0.16em] ${
                        e.isPublished ? 'border-teal-300/30 text-teal-200' : 'border-amber-300/30 text-amber-200'
                      }`}
                    >
                      {e.isPublished ? 'Published' : 'Draft'}
                    </span>
                    <span className="font-mono text-xs text-white/40">/{e.slug}</span>
                  </div>
                  <p className="mt-2 truncate font-serif text-lg text-white/90">{e.title}</p>
                  <p className="truncate text-sm text-white/50">
                    {e.brandName} · {formatEventWhen(e)}
                  </p>
                  {e.rsvpMode === 'builtin' && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-white/45">
                      <Users size={13} /> {e.registered} RSVP{e.registered === 1 ? '' : 's'} · {e.checkedIn} checked in
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <a href={`/${e.slug}`} target="_blank" rel="noopener noreferrer" title={e.isPublished ? 'View page' : 'Preview draft'} className="p-2 rounded-lg text-white/70 transition hover:bg-white/10">
                    <ExternalLink size={16} />
                  </a>
                  {e.rsvpMode === 'builtin' && (
                    <a href={`/${e.slug}/scan`} target="_blank" rel="noopener noreferrer" title="Door scanner" className="p-2 rounded-lg text-white/70 transition hover:bg-white/10">
                      <ScanLine size={16} />
                    </a>
                  )}
                  <Link href={`/admin/event-pages/new?from=${e.id}`} title="Duplicate (same brand & theme)" className="p-2 rounded-lg text-white/70 transition hover:bg-white/10">
                    <Copy size={16} />
                  </Link>
                  <Link href={`/admin/event-pages/${e.id}`} title="Edit" className="p-2 rounded-lg text-teal-300 transition hover:bg-teal-300/20">
                    <Edit2 size={16} />
                  </Link>
                  <button onClick={() => setDeleteTarget(e)} title="Delete" className="p-2 rounded-lg text-red-400 transition hover:bg-red-600/20">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        title="Delete event page"
        message={`Delete “${deleteTarget?.title ?? ''}”? /${deleteTarget?.slug ?? ''} will stop working. Pages with RSVPs can only be unpublished.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

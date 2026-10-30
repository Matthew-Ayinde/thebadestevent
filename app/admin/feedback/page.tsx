'use client';

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, Trash2, ChevronLeft, ChevronRight, Star, ExternalLink } from 'lucide-react';
import AdminButton from '@/components/admin/AdminButton';
import AdminModal from '@/components/admin/AdminModal';
import AdminTable from '@/components/admin/AdminTable';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';

const PAGE_SIZE = 20;

function Detail({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div>
      <p className="text-xs uppercase text-white/40 tracking-widest mb-1">{label}</p>
      <p className="text-white/85 text-sm leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{value}</p>
    </div>
  );
}

function displayName(row: any) {
  return row.creditAs === 'Anonymous' || !row.name ? 'Anonymous' : row.name;
}

function handles(row: any) {
  return [
    row.instagram && `Instagram: @${row.instagram}`,
    row.tiktok && `TikTok: @${row.tiktok}`,
    row.twitter && `X: @${row.twitter}`,
    row.linkedin && `LinkedIn: ${row.linkedin}`,
  ].filter(Boolean).join('\n');
}

function FeaturedBadge({ row }: { row: any }) {
  if (row.featured) {
    return <span className="rounded-full border border-teal-300/30 bg-teal-300/15 px-2.5 py-1 text-xs text-teal-100">On the wall</span>;
  }
  if (!row.contentConsent) {
    return <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/45">Private</span>;
  }
  return <span className="rounded-full border border-white/12 bg-white/6 px-2.5 py-1 text-xs text-white/70">Can share</span>;
}

export default function FeedbackAdminPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [selected, setSelected]       = useState<any | null>(null);
  const [deleteId, setDeleteId]       = useState<string | null>(null);
  const [isDeleting, setIsDeleting]   = useState(false);
  const [togglingId, setTogglingId]   = useState<string | null>(null);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);
  const [featuredCount, setFeaturedCount] = useState(0);
  const [wallSize, setWallSize]           = useState(8);
  // Set when the wall is full: the story waiting to go on, and the one it would replace.
  const [wallFull, setWallFull] = useState<{ row: any; oldest?: { id: string; name: string } } | null>(null);

  useEffect(() => { fetch_(page); }, [page]);

  async function fetch_(p = 1) {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/feedback?page=${p}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSubmissions(data.submissions || []);
      setPage(data.page || p);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setFeaturedCount(data.featuredCount ?? 0);
      if (data.wallSize) setWallSize(data.wallSize);
    } catch {
      toast.error('Failed to load stories');
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleFeatured(row: any, replaceOldest = false) {
    try {
      setTogglingId(row._id);
      const res = await fetch(`/api/feedback/${row._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !row.featured, replaceOldest }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.code === 'WALL_FULL') {
        if (data.wallSize) setWallSize(data.wallSize);
        setWallFull({ row, oldest: data.oldest || undefined });
        return;
      }
      if (!res.ok) throw new Error(data.error || `Update failed (${res.status})`);
      const update = (s: any) => {
        if (s._id === row._id) return { ...s, featured: data.featured };
        if (s._id === data.replacedId) return { ...s, featured: false };
        return s;
      };
      setSubmissions(prev => prev.map(update));
      setSelected((prev: any) => (prev ? update(prev) : prev));
      if (typeof data.featuredCount === 'number') setFeaturedCount(data.featuredCount);
      toast.success(
        data.replacedId ? 'Swapped onto the stories wall'
          : data.featured ? 'Added to the stories wall' : 'Removed from the stories wall'
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmReplace() {
    if (!wallFull) return;
    const { row } = wallFull;
    setWallFull(null);
    await toggleFeatured(row, true);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/feedback/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Story deleted');
      setDeleteId(null);
      setSelected(null);
      await fetch_(page);
    } catch {
      toast.error('Failed to delete story');
    } finally {
      setIsDeleting(false);
    }
  }

  function featureButton(row: any) {
    return (
      <button
        onClick={() => toggleFeatured(row)}
        disabled={!row.contentConsent || togglingId === row._id}
        title={row.contentConsent ? (row.featured ? 'Remove from the wall' : 'Feature on the wall') : 'No consent to share'}
        className={`p-2 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed ${
          row.featured ? 'text-teal-200 hover:bg-teal-300/20' : 'text-white/50 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Star size={16} fill={row.featured ? 'currentColor' : 'none'} />
      </button>
    );
  }

  const columns = [
    {
      key: 'name',
      label: 'Credited as',
      render: (_: any, row: any) => (
        <div className="min-w-0">
          <p className="truncate">{displayName(row)}</p>
          <p className="text-xs text-white/40">{row.creditAs}</p>
        </div>
      ),
    },
    { key: 'movedFrom', label: 'Moved from' },
    { key: 'yearReturned', label: 'Returned' },
    { key: 'photoUrl', label: 'Photo', render: (_: any, row: any) => (row.photoUrl ? 'Yes' : '—') },
    { key: 'featured', label: 'Status', render: (_: any, row: any) => <FeaturedBadge row={row} /> },
    {
      key: 'createdAt',
      label: 'Submitted',
      render: (_: any, row: any) =>
        new Date(row.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-1">
          {featureButton(row)}
          <button onClick={() => setSelected(row)} className="p-2 hover:bg-teal-300/20 text-teal-200 rounded-lg transition">
            <Eye size={16} />
          </button>
          <button onClick={() => setDeleteId(row._id)} className="p-2 hover:bg-red-600/20 text-red-400 rounded-lg transition">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 md:mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-4xl text-white/90">Came Home Stories</h1>
          <p className="text-white/50 mt-1 md:mt-2 text-sm md:text-base">
            Stories shared on <a href="/feedback" target="_blank" className="text-teal-200 hover:underline">/feedback</a>.
            Star a story to feature it on the wall (only stories shared with consent).
          </p>
        </div>
        <div
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
            featuredCount >= wallSize ? 'border-teal-300/40 bg-teal-300/15 text-teal-100' : 'border-white/12 bg-white/5 text-white/70'
          }`}
        >
          <Star size={14} fill={featuredCount > 0 ? 'currentColor' : 'none'} />
          <span><span className="font-semibold tabular-nums">{featuredCount}</span> of {wallSize} on the wall</span>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : submissions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/40 text-sm">No stories yet</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-[1.8rem] p-4 md:p-6 backdrop-blur-sm">
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {submissions.map(row => (
              <div key={row._id} className="border rounded-2xl p-4 bg-white/5 border-white/10">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 font-medium truncate">{displayName(row)}</p>
                    <p className="text-white/55 text-xs mt-1 truncate">{row.movedFrom} · {row.yearReturned}</p>
                    <div className="mt-2"><FeaturedBadge row={row} /></div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {featureButton(row)}
                    <button onClick={() => setSelected(row)} className="p-2 hover:bg-teal-300/20 text-teal-200 rounded-lg transition">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => setDeleteId(row._id)} className="p-2 hover:bg-red-600/20 text-red-400 rounded-lg transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <AdminTable columns={columns} data={submissions} />
          </div>

          {/* Pagination */}
          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/50">
              {`Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
            </p>
            <div className="flex items-center gap-2">
              <AdminButton variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={isLoading || page <= 1} className="px-4! py-2! flex items-center gap-2">
                <ChevronLeft size={16} /><span className="hidden sm:inline">Previous</span>
              </AdminButton>
              <span className="text-sm text-white/60 px-1">{page} / {Math.max(1, totalPages)}</span>
              <AdminButton variant="secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={isLoading || page >= totalPages} className="px-4! py-2! flex items-center gap-2">
                <span className="hidden sm:inline">Next</span><ChevronRight size={16} />
              </AdminButton>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <AdminModal isOpen={!!selected} onClose={() => setSelected(null)} title="Homecoming Story" size="lg">
        {selected && (
          <div className="space-y-4">
            {selected.photoUrl && (
              <a href={selected.photoUrl} target="_blank" rel="noopener noreferrer" className="group relative block overflow-hidden rounded-2xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.photoUrl} alt="" className="max-h-80 w-full object-cover" />
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white/80 opacity-0 transition group-hover:opacity-100">
                  <ExternalLink size={12} /> Full size
                </span>
              </a>
            )}

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <div>
                <p className="text-sm text-white/85">{selected.contentConsent ? 'Consented to sharing' : 'Asked to keep it private'}</p>
                <p className="text-xs text-white/40 mt-0.5">
                  {selected.contentConsent ? (selected.wantsTag ? 'Happy to be tagged' : 'Do not tag') : 'Cannot be featured'}
                </p>
              </div>
              {selected.contentConsent && (
                <AdminButton
                  variant={selected.featured ? 'secondary' : 'primary'}
                  onClick={() => toggleFeatured(selected)}
                  disabled={togglingId === selected._id}
                  className="flex items-center gap-2 px-4! py-2!"
                >
                  <Star size={15} fill={selected.featured ? 'currentColor' : 'none'} />
                  {selected.featured ? 'Remove from wall' : 'Feature on wall'}
                </AdminButton>
              )}
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-4">
              <Detail label="Credited as" value={`${displayName(selected)} (${selected.creditAs})`} />
              <Detail label="Moved back from" value={selected.movedFrom} />
              <Detail label="Year returned" value={selected.yearReturned} />
              <Detail label="Social handles" value={handles(selected)} />
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-4">
              <Detail label="Their story" value={selected.story} />
              <Detail label="Wished they'd had help with" value={selected.wishedHelpWith} />
              <Detail label="Wish someone had prepared them for" value={selected.wishPrepared} />
              <Detail label="When they landed" value={selected.landingThoughts} />
            </div>
          </div>
        )}
      </AdminModal>

      <ConfirmationDialog
        isOpen={!!wallFull}
        title="The wall is full"
        message={
          wallFull?.oldest
            ? `The wall holds ${wallSize} stories. Featuring ${displayName(wallFull.row)}'s story will take ${wallFull.oldest.name}'s off the wall (it has been up the longest).`
            : `The wall holds ${wallSize} stories. Featuring this one will take the longest-featured story off the wall.`
        }
        onConfirm={confirmReplace}
        onCancel={() => setWallFull(null)}
        isLoading={!!wallFull && togglingId === wallFull.row._id}
        confirmText="Replace"
      />

      <ConfirmationDialog
        isOpen={!!deleteId}
        title="Delete Story"
        message="Are you sure you want to delete this story and its photo? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

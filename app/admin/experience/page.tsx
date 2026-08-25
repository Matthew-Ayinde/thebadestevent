'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, Trash2, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import AdminButton from '@/components/admin/AdminButton';
import AdminModal from '@/components/admin/AdminModal';
import AdminTable from '@/components/admin/AdminTable';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';

const PAGE_SIZE = 20;

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs uppercase text-white/40 tracking-widest mb-1">{label}</p>
      <p className="text-white/85 text-sm leading-relaxed whitespace-pre-line">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const hasContent = Array.isArray(children)
    ? (children as any[]).some(Boolean)
    : !!children;
  if (!hasContent) return null;
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <p className="text-[0.6rem] uppercase tracking-[0.28em] text-[#7dd3cf]/70 mb-4">{title}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export default function GuestExperiencePage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [selected, setSelected]       = useState<any | null>(null);
  const [deleteId, setDeleteId]       = useState<string | null>(null);
  const [isDeleting, setIsDeleting]   = useState(false);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);

  useEffect(() => { fetch_(page); }, [page]);

  async function fetch_(p = 1) {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/experience?page=${p}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSubmissions(data.submissions || []);
      setPage(data.page || p);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load feedback');
    } finally {
      setIsLoading(false);
    }
  }

  async function exportCsv() {
    try {
      const res = await fetch(`/api/experience?page=1&limit=10000`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const rows: any[] = data.submissions || [];
      if (rows.length === 0) { toast.error('No feedback to export'); return; }

      const cell = (v: any) => `"${String(v || '').replace(/"/g, '""')}"`;

      const headers = [
        'Submitted At', 'Felt Welcomed', 'Anticipated Moment', 'What Happened',
        'Cared For (1-5)', 'Felt Overlooked / Unsure', 'Would Return', 'Email',
      ];

      const csvRows = rows.map(r => [
        cell(new Date(r.createdAt).toLocaleDateString('en-GB')),
        cell(r.welcomed), cell(r.anticipatedMoment), cell(r.anticipatedMomentDetail),
        cell(r.caredForScore), cell(r.overlookedMoment), cell(r.wouldReturn), cell(r.email),
      ].join(','));

      const csv = [headers.map(h => `"${h}"`).join(','), ...csvRows].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rinwa-guest-experience-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} response${rows.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Export failed');
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/experience/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Response deleted');
      setDeleteId(null);
      await fetch_(page);
    } catch {
      toast.error('Failed to delete response');
    } finally {
      setIsDeleting(false);
    }
  }

  const columns = [
    { key: 'welcomed', label: 'Welcomed' },
    { key: 'caredForScore', label: 'Cared For', render: (_: any, row: any) => `${row.caredForScore} / 5` },
    { key: 'wouldReturn', label: 'Would Return' },
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
        <div className="flex gap-2">
          <button onClick={() => setSelected(row)} className="p-2 hover:bg-[#7dd3cf]/20 text-[#7dd3cf] rounded-lg transition">
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
          <h1 className="font-serif text-2xl sm:text-4xl text-white/90">Guest Experience Feedback</h1>
          <p className="text-white/50 mt-1 md:mt-2 text-sm md:text-base">
            Anonymous post-event responses — how tonight felt, not just how it ran
          </p>
        </div>
        {total > 0 && (
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-full border border-[#7dd3cf]/30 bg-[#7dd3cf]/10 px-5 py-2.5 text-sm font-medium text-[#7dd3cf] transition hover:border-[#7dd3cf]/50 hover:bg-[#7dd3cf]/18"
          >
            <Download size={15} />
            Export CSV
          </button>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : submissions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/40 text-sm">No feedback yet</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-[1.8rem] p-4 md:p-6 backdrop-blur-sm">
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {submissions.map(row => (
              <div key={row._id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 font-medium truncate">Welcomed: {row.welcomed}</p>
                    <p className="text-[#7dd3cf]/80 text-xs mt-0.5 truncate">Cared for: {row.caredForScore} / 5</p>
                    <p className="text-white/55 text-xs mt-1">Would return: {row.wouldReturn}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setSelected(row)} className="p-2 hover:bg-[#7dd3cf]/20 text-[#7dd3cf] rounded-lg transition">
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
              {total === 0
                ? 'No responses'
                : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
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
      <AdminModal isOpen={!!selected} onClose={() => setSelected(null)} title="Guest Experience Response">
        {selected && (
          <div className="space-y-4">
            <Section title="First Impressions">
              <Detail label="Felt welcomed the moment they walked in" value={selected.welcomed} />
            </Section>

            <Section title="The Little Things">
              <Detail label="A moment someone anticipated a need" value={selected.anticipatedMoment} />
              <Detail label="What happened" value={selected.anticipatedMomentDetail} />
            </Section>

            <Section title="Beyond The Run Of Show">
              <Detail label="How cared for they felt (1–5)" value={String(selected.caredForScore)} />
            </Section>

            <Section title="The Honest Part">
              <Detail label="Felt overlooked or unsure what to do" value={selected.overlookedMoment} />
            </Section>

            <Section title="Would They Return">
              <Detail label="Would come back for the treatment, not just the lineup/venue" value={selected.wouldReturn} />
            </Section>

            {selected.email && (
              <Section title="Contact">
                <Detail label="Email (left for a confirmation copy)" value={selected.email} />
              </Section>
            )}
          </div>
        )}
      </AdminModal>

      <ConfirmationDialog
        isOpen={!!deleteId}
        title="Delete Response"
        message="Are you sure you want to delete this response? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

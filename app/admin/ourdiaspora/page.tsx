'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, Trash2, ChevronLeft, ChevronRight, Mail, Download } from 'lucide-react';
import AdminButton from '@/components/admin/AdminButton';
import AdminModal from '@/components/admin/AdminModal';
import AdminTable from '@/components/admin/AdminTable';
import AdminCheckbox from '@/components/admin/AdminCheckbox';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';

const PAGE_SIZE = 20;
const ACCENT = '#e8c07a';

function Detail({ label, value }: { label: string; value?: string | string[] }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div>
      <p className="text-xs uppercase text-white/40 tracking-widest mb-1">{label}</p>
      {Array.isArray(value) ? (
        <div className="flex flex-wrap gap-2 mt-1">
          {value.map((v, i) => (
            <span key={i} className="px-3 py-1 bg-[#e8c07a]/12 text-[#e8c07a] rounded-full text-sm">{v}</span>
          ))}
        </div>
      ) : (
        <p className="text-white/85 text-sm leading-relaxed whitespace-pre-line">{value}</p>
      )}
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
      <p className="text-[0.6rem] uppercase tracking-[0.28em] text-[#e8c07a]/70 mb-4">{title}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export default function OurDiasporaAdminPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [selected, setSelected]       = useState<any | null>(null);
  const [deleteId, setDeleteId]       = useState<string | null>(null);
  const [isDeleting, setIsDeleting]   = useState(false);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => { setSelectedIds(new Set()); fetch_(page); }, [page]);

  function toggleRow(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(prev =>
      prev.size === submissions.length ? new Set() : new Set(submissions.map(s => s._id))
    );
  }

  async function fetch_(p = 1) {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/homecoming?page=${p}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSubmissions(data.submissions || []);
      setPage(data.page || p);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load check-ins');
    } finally {
      setIsLoading(false);
    }
  }

  async function exportCsv() {
    try {
      const res = await fetch(`/api/homecoming?page=1&limit=10000`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const rows: any[] = data.submissions || [];
      if (rows.length === 0) { toast.error('No check-ins to export'); return; }

      const arr = (v: any) => Array.isArray(v) ? v.join(' | ') : (v || '');
      const cell = (v: any) => {
        const s = arr(v);
        return `"${String(s).replace(/"/g, '""')}"`;
      };

      const headers = [
        'Submitted At', 'Name', 'Contact Method', 'Contact Detail',
        'First Time or Returning', 'Timeframe', 'Family/Friends Aware',
        'Reason', 'Reason (Other)', 'Needs Handled', 'Needs Handled (Other)', 'Wants Help',
        'Excited For', 'Excited For (Other)',
      ];

      const csvRows = rows.map(r => [
        cell(new Date(r.createdAt).toLocaleDateString('en-GB')),
        cell(r.name), cell(r.contactMethod), cell(r.contactValue),
        cell(r.visitorType), cell(r.timeframe), cell(r.familyAware),
        cell(r.reason), cell(r.reasonOther), cell(r.challenges), cell(r.challengesOther), cell(r.wantsHelp),
        cell(r.excitedFor), cell(r.excitedForOther),
      ].join(','));

      const csv = [headers.map(h => `"${h}"`).join(','), ...csvRows].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rinwa-homecoming-checkins-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} check-in${rows.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Export failed');
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/homecoming/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Check-in deleted');
      setDeleteId(null);
      await fetch_(page);
    } catch {
      toast.error('Failed to delete check-in');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      setIsBulkDeleting(true);
      const results = await Promise.allSettled(
        ids.map(id => fetch(`/api/homecoming/${id}`, { method: 'DELETE' }))
      );
      const failed = results.filter(r => r.status === 'rejected' || !r.value.ok).length;
      const succeeded = ids.length - failed;
      if (succeeded > 0) toast.success(`Deleted ${succeeded} check-in${succeeded !== 1 ? 's' : ''}`);
      if (failed > 0) toast.error(`Failed to delete ${failed} check-in${failed !== 1 ? 's' : ''}`);
      setBulkDeleteOpen(false);
      setSelectedIds(new Set());
      await fetch_(page);
    } catch {
      toast.error('Failed to delete check-ins');
    } finally {
      setIsBulkDeleting(false);
    }
  }

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'contactValue', label: 'Contact', render: (_: any, row: any) => `${row.contactValue} (${row.contactMethod})` },
    { key: 'visitorType', label: 'Type' },
    { key: 'timeframe', label: 'Timeframe' },
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
          <button onClick={() => setSelected(row)} className="p-2 hover:bg-[#e8c07a]/20 text-[#e8c07a] rounded-lg transition">
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
          <h1 className="font-serif text-2xl sm:text-4xl text-white/90">Diaspora Check-Ins</h1>
          <p className="text-white/50 mt-1 md:mt-2 text-sm md:text-base">
            Ember to Remember 2026, holiday travel intake responses
          </p>
        </div>
        {total > 0 && (
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-full border border-[#e8c07a]/30 bg-[#e8c07a]/10 px-5 py-2.5 text-sm font-medium text-[#e8c07a] transition hover:border-[#e8c07a]/50 hover:bg-[#e8c07a]/18"
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
          <p className="text-white/40 text-sm">No check-ins yet</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-[1.8rem] p-4 md:p-6 backdrop-blur-sm">
          {/* Selection toolbar */}
          {selectedIds.size > 0 && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/6 px-4 py-3">
              <p className="text-sm text-white/70">
                <span className="text-white/90 font-medium">{selectedIds.size}</span> selected
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedIds(new Set())} className="text-sm text-white/50 hover:text-white/80 transition px-3 py-2">
                  Clear
                </button>
                <button
                  onClick={() => setBulkDeleteOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-red-600/80 hover:bg-red-600 text-white px-5 py-2.5 text-sm font-medium transition"
                >
                  <Trash2 size={15} />
                  Delete selected
                </button>
              </div>
            </div>
          )}

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {submissions.map(row => (
              <div
                key={row._id}
                className={`border rounded-2xl p-4 transition ${selectedIds.has(row._id) ? 'bg-white/10 border-[#e8c07a]/30' : 'bg-white/5 border-white/10'}`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="pt-1">
                      <AdminCheckbox
                        checked={selectedIds.has(row._id)}
                        onChange={() => toggleRow(row._id)}
                        accentColor={ACCENT}
                        ariaLabel="Select check-in"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/90 font-medium truncate">{row.name}</p>
                      <p className="text-[#e8c07a]/80 text-xs mt-0.5 truncate">{row.contactValue} ({row.contactMethod})</p>
                      <p className="text-white/55 text-xs mt-1">{row.visitorType} · {row.timeframe}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setSelected(row)} className="p-2 hover:bg-[#e8c07a]/20 text-[#e8c07a] rounded-lg transition">
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
            <AdminTable
              columns={columns}
              data={submissions}
              selectable
              selectedIds={selectedIds}
              onToggleRow={toggleRow}
              onToggleAll={toggleAll}
              accentColor={ACCENT}
            />
          </div>

          {/* Pagination */}
          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/50">
              {total === 0
                ? 'No check-ins'
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
      <AdminModal isOpen={!!selected} onClose={() => setSelected(null)} title="Diaspora Check-In">
        {selected && (
          <div className="space-y-4">
            <Section title="Contact">
              <Detail label="Name" value={selected.name} />
              <Detail label="Reach via" value={selected.contactMethod} />
              <Detail label="Contact Detail" value={selected.contactValue} />
            </Section>

            <Section title="Trip Details">
              <Detail label="First Time or Returning" value={selected.visitorType} />
              <Detail label="Timeframe" value={selected.timeframe} />
              <Detail label="Family / Friends Aware" value={selected.familyAware} />
            </Section>

            <Section title="Motivation">
              <Detail label="Reason for Coming" value={selected.reason} />
              <Detail label="Other Reason" value={selected.reasonOther} />
            </Section>

            <Section title="Needs Handled">
              <Detail label="Needs Handled" value={selected.challenges} />
              <Detail label="Other Need" value={selected.challengesOther} />
              <Detail label="Wants On-Ground Help" value={selected.wantsHelp} />
            </Section>

            <Section title="Excitement">
              <Detail label="Excited To Experience" value={selected.excitedFor} />
              <Detail label="Other Excitement" value={selected.excitedForOther} />
            </Section>

            {selected.contactMethod === 'Email' && (
              <div className="pt-2">
                <AdminButton onClick={() => window.open(`mailto:${selected.contactValue}?subject=Re: Your RÌNWÁ Homecoming Check-In`)} variant="primary" className="w-full">
                  <Mail size={17} className="inline mr-2" />
                  Reply via Email
                </AdminButton>
              </div>
            )}
          </div>
        )}
      </AdminModal>

      <ConfirmationDialog
        isOpen={!!deleteId}
        title="Delete Check-In"
        message="Are you sure you want to delete this check-in? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />

      <ConfirmationDialog
        isOpen={bulkDeleteOpen}
        title="Delete Check-Ins"
        message={`Are you sure you want to delete ${selectedIds.size} check-in${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
        isLoading={isBulkDeleting}
        confirmText={`Delete ${selectedIds.size}`}
      />
    </div>
  );
}

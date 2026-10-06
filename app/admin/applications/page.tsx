'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, Download, ExternalLink, Eye, FileText, Mail, Phone, Search, Trash2,
} from 'lucide-react';
import AdminButton from '@/components/admin/AdminButton';
import AdminModal from '@/components/admin/AdminModal';
import AdminTable from '@/components/admin/AdminTable';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  formatBytes,
  type ApplicationStatus,
} from '@/lib/careers';

const PAGE_SIZE = 20;

type Filter = 'all' | ApplicationStatus;
const FILTERS: Filter[] = ['all', ...APPLICATION_STATUSES];

const STATUS_CLS: Record<ApplicationStatus, string> = {
  new: 'bg-teal-300/12 text-teal-200 border-teal-300/30',
  reviewing: 'bg-sky-300/10 text-sky-200 border-sky-300/25',
  shortlisted: 'bg-amber-300/10 text-amber-200 border-amber-300/25',
  hired: 'bg-emerald-300/12 text-emerald-200 border-emerald-300/30',
  rejected: 'bg-white/8 text-white/50 border-white/12',
};

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap ${STATUS_CLS[status] ?? STATUS_CLS.new}`}>
      {APPLICATION_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatDate(value: string, withTime = false) {
  return new Date(value).toLocaleString('en-GB', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

function Detail({ label, children }: { label: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div>
      <p className="text-xs uppercase text-white/40 tracking-widest mb-1">{label}</p>
      <div className="text-white/85 text-sm leading-relaxed whitespace-pre-line break-words">{children}</div>
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Applications />
    </Suspense>
  );
}

function Applications() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const jobFilter = searchParams.get('job') ?? '';
  const openId = searchParams.get('id');

  const [rows, setRows] = useState<any[]>([]);
  const [jobs, setJobs] = useState<{ _id: string; title: string; status: string }[]>([]);
  const [counts, setCounts] = useState<Record<Filter, number>>(
    Object.fromEntries(FILTERS.map(f => [f, 0])) as Record<Filter, number>
  );
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const requestSeq = useRef(0);

  useEffect(() => {
    fetch('/api/job-postings?scope=admin')
      .then(r => (r.ok ? r.json() : []))
      .then(data => setJobs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => { setPage(1); }, [jobFilter, debouncedQuery, filter]);

  useEffect(() => { load(page); }, [page, filter, jobFilter, debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep link from the admin notification email: /admin/applications?id=…
  useEffect(() => {
    if (!openId) return;
    fetch(`/api/job-applications/${openId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(app => { if (app) openApplication(app); else toast.error('That application could not be found'); })
      .catch(() => {});
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  function params(extra: Record<string, string | number>) {
    const p = new URLSearchParams({ status: filter, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) });
    if (jobFilter) p.set('job', jobFilter);
    if (debouncedQuery) p.set('q', debouncedQuery);
    return p.toString();
  }

  async function load(p: number) {
    const seq = ++requestSeq.current;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/job-applications?${params({ page: p, limit: PAGE_SIZE })}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (seq !== requestSeq.current) return; // a newer request superseded this one
      setRows(data.applications || []);
      setCounts(data.counts || counts);
      setPage(data.page || p);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      if (seq === requestSeq.current) toast.error('Failed to load applications');
    } finally {
      if (seq === requestSeq.current) setIsLoading(false);
    }
  }

  function setJobFilter(jobId: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (jobId) p.set('job', jobId); else p.delete('job');
    p.delete('id');
    router.replace(`${pathname}${p.size ? `?${p}` : ''}`);
  }

  function closeDetail() {
    setSelected(null);
    if (openId) {
      const p = new URLSearchParams(searchParams.toString());
      p.delete('id');
      router.replace(`${pathname}${p.size ? `?${p}` : ''}`);
    }
  }

  function openApplication(app: any) {
    setSelected(app);
    // Opening a new application moves it into review automatically.
    if (app.status === 'new') updateApplication(app._id, { status: 'reviewing' }, { silent: true });
  }

  async function updateApplication(id: string, patch: { status?: ApplicationStatus; notes?: string }, opts: { silent?: boolean } = {}) {
    try {
      const res = await fetch(`/api/job-applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setSelected((s: any) => (s && s._id === id ? updated : s));
      setRows(rs => rs.map(r => (r._id === id ? updated : r)));
      if (!opts.silent) toast.success(patch.notes !== undefined ? 'Notes saved' : `Marked as ${APPLICATION_STATUS_LABELS[patch.status!]}`);
      if (patch.status) load(page);
    } catch {
      if (!opts.silent) toast.error('Failed to update application');
    }
  }

  async function exportCsv() {
    try {
      const res = await fetch(`/api/job-applications?${params({ page: 1, limit: 10000 })}`);
      if (!res.ok) throw new Error();
      const all: any[] = (await res.json()).applications || [];
      if (all.length === 0) { toast.error('No applications to export'); return; }

      // Prefix formula-like values so spreadsheet apps don't execute applicant input (phone numbers stay as-is).
      const cell = (v: any) => {
        const s = String(v ?? '');
        const formula = /^[=@\t\r]/.test(s) || (/^[+-]/.test(s) && !/^[+-][\d\s().-]+$/.test(s));
        return `"${(formula ? `'${s}` : s).replace(/"/g, '""')}"`;
      };
      const questionLabels = Array.from(new Set(all.flatMap(a => (a.answers || []).map((x: any) => x.label))));
      const headers = ['Status', 'Role', 'Name', 'Email', 'Phone', 'Location', 'LinkedIn', 'Portfolio', 'Résumé', 'Cover Letter', ...questionLabels, 'Notes', 'Applied At'];
      const lines = all.map(a => [
        APPLICATION_STATUS_LABELS[a.status as ApplicationStatus] ?? a.status, a.jobTitle, a.fullName, a.email, a.phone,
        a.location, a.linkedin, a.portfolio, a.resume ? a.resume.fileName : '', a.coverLetter,
        ...questionLabels.map(label => (a.answers || []).find((x: any) => x.label === label)?.value ?? ''),
        a.notes, new Date(a.createdAt).toISOString(),
      ].map(cell).join(','));

      const csv = '﻿' + [headers.map(cell).join(','), ...lines].join('\r\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `rinwa-applications-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} application${all.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Export failed');
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/job-applications/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Application deleted');
      if (selected?._id === deleteId) closeDetail();
      setDeleteId(null);
      await load(page);
    } catch {
      toast.error('Failed to delete application');
    } finally {
      setIsDeleting(false);
    }
  }

  const actions = (row: any) => (
    <div className="flex gap-1">
      <button onClick={() => openApplication(row)} className="p-2 hover:bg-teal-300/20 text-teal-300 rounded-lg transition" aria-label="View application">
        <Eye size={16} />
      </button>
      <button onClick={() => setDeleteId(row._id)} className="p-2 hover:bg-red-600/20 text-red-400 rounded-lg transition" aria-label="Delete application">
        <Trash2 size={16} />
      </button>
    </div>
  );

  const columns = [
    {
      key: 'fullName',
      label: 'Applicant',
      render: (_: any, row: any) => (
        <div className="min-w-0">
          <p className="text-white/90 flex items-center gap-2">
            {row.status === 'new' && <span className="h-1.5 w-1.5 rounded-full bg-teal-300" aria-label="New" />}
            {row.fullName}
          </p>
          <p className="text-teal-300/70 text-xs">{row.email}</p>
        </div>
      ),
    },
    { key: 'jobTitle', label: 'Role', render: (v: string) => <p className="max-w-[16rem] truncate text-white/75">{v}</p> },
    {
      key: 'resume',
      label: 'Résumé',
      render: (_: any, row: any) => row.resume
        ? <a href={`/api/job-applications/${row._id}/resume`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-teal-300/85 hover:text-teal-200 text-xs"><FileText size={13} /> Download</a>
        : <span className="text-white/30">—</span>,
    },
    { key: 'status', label: 'Status', render: (v: ApplicationStatus) => <StatusBadge status={v} /> },
    { key: 'createdAt', label: 'Applied', render: (v: string) => <span className="whitespace-nowrap">{formatDate(v)}</span> },
    { key: 'actions', label: 'Actions', render: (_: any, row: any) => actions(row) },
  ];

  const emptyMessage = debouncedQuery
    ? `No applications match “${debouncedQuery}”`
    : filter === 'all' ? 'No applications yet' : `No applications marked ${APPLICATION_STATUS_LABELS[filter].toLowerCase()}`;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 md:mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-4xl text-white/90">Applications</h1>
          <p className="text-white/50 mt-1 md:mt-2 text-sm md:text-base">Everyone who applied through the careers page</p>
        </div>
        {total > 0 && (
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-300/10 px-5 py-2.5 text-sm font-medium text-teal-200 transition hover:border-teal-300/50 hover:bg-teal-300/18"
          >
            <Download size={15} />
            Export CSV
          </button>
        )}
      </div>

      {/* Role + search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <select
          aria-label="Filter by role" value={jobFilter} onChange={e => setJobFilter(e.target.value)}
          className="w-full sm:w-72 rounded-full border border-white/10 bg-[#041114]/60 px-4 py-2.5 text-sm text-white/85 focus:border-teal-300/50 focus:outline-none"
        >
          <option value="">All roles</option>
          {jobs.map(j => <option key={j._id} value={j._id}>{j.title}{j.status !== 'open' ? ` (${j.status})` : ''}</option>)}
        </select>
        <label className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or email"
            className="w-full rounded-full border border-white/10 bg-[#041114]/60 py-2.5 pl-10 pr-4 text-sm text-white/85 placeholder-white/30 focus:border-teal-300/50 focus:outline-none"
          />
        </label>
      </div>

      {/* Status filters */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
              filter === f
                ? 'border-teal-300/60 bg-teal-300/14 text-teal-200'
                : 'border-white/10 bg-white/4 text-white/55 hover:border-white/20 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : APPLICATION_STATUS_LABELS[f]}
            <span className={`rounded-full px-2 py-0.5 text-xs ${filter === f ? 'bg-teal-300/20' : 'bg-white/8'}`}>{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {isLoading && rows.length === 0 ? (
        <LoadingSpinner />
      ) : rows.length === 0 ? (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-[1.8rem]">
          <p className="text-white/40 text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className={`bg-white/5 border border-white/10 rounded-[1.8rem] p-4 md:p-6 backdrop-blur-sm transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {rows.map(row => (
              <div key={row._id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex justify-between items-start gap-3">
                  <button type="button" onClick={() => openApplication(row)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-white/90 font-medium truncate">{row.fullName}</p>
                      <StatusBadge status={row.status} />
                    </div>
                    <p className="text-teal-300/80 text-xs mt-0.5 truncate">{row.email}</p>
                    <p className="text-white/60 text-xs mt-2 truncate">{row.jobTitle}</p>
                    <p className="text-white/35 text-xs mt-1">{formatDate(row.createdAt)}</p>
                  </button>
                  {actions(row)}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <AdminTable columns={columns} data={rows} />
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

      <AdminModal isOpen={!!selected} onClose={closeDetail} title="Application" size="xl">
        {selected && (
          <ApplicationDetail
            key={selected._id}
            app={selected}
            onStatus={status => updateApplication(selected._id, { status })}
            onNotes={notes => updateApplication(selected._id, { notes })}
            onDelete={() => setDeleteId(selected._id)}
          />
        )}
      </AdminModal>

      <ConfirmationDialog
        isOpen={!!deleteId}
        title="Delete Application"
        message="This permanently deletes the application and the applicant's résumé. This can't be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

function ApplicationDetail({ app, onStatus, onNotes, onDelete }: {
  app: any;
  onStatus: (s: ApplicationStatus) => void;
  onNotes: (notes: string) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState<string>(app.notes ?? '');
  const notesDirty = notes !== (app.notes ?? '');
  const answers = (app.answers || []).filter((a: any) => a.value);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif text-2xl text-white/90">{app.fullName}</p>
            <p className="text-sm text-white/55 mt-0.5">Applied for <span className="text-white/80">{app.jobTitle}</span> · {formatDate(app.createdAt, true)}</p>
          </div>
          <StatusBadge status={app.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`mailto:${app.email}`} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-teal-200 hover:border-teal-300/40 break-all">
            <Mail size={12} /> {app.email}
          </a>
          <a href={`tel:${app.phone}`} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75 hover:border-teal-300/40">
            <Phone size={12} /> {app.phone}
          </a>
          {app.linkedin && <ExtLink href={app.linkedin}>LinkedIn</ExtLink>}
          {app.portfolio && <ExtLink href={app.portfolio}>Portfolio</ExtLink>}
        </div>
        <Detail label="Based in">{app.location}</Detail>
      </div>

      {app.resume && (
        <a
          href={`/api/job-applications/${app._id}/resume`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-2xl border border-teal-300/25 bg-teal-300/[0.05] p-4 transition hover:border-teal-300/50 hover:bg-teal-300/10"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-300/30 bg-[#041114]/60">
            <FileText size={17} className="text-teal-300" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white/85">{app.resume.fileName}</p>
            <p className="text-xs text-white/40">{app.resume.format?.toUpperCase()} · {formatBytes(app.resume.bytes || 0)}</p>
          </div>
          <Download size={16} className="shrink-0 text-teal-300" />
        </a>
      )}

      {(app.coverLetter || answers.length > 0) && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-5">
          <Detail label="Cover letter">{app.coverLetter}</Detail>
          {answers.map((a: any) => (
            <Detail key={a.questionId} label={a.label}>
              {a.type === 'url'
                ? <a href={a.value} target="_blank" rel="noopener noreferrer" className="text-teal-300 hover:text-teal-200 break-all">{a.value}</a>
                : a.value}
            </Detail>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-4">
        <p className="text-[0.6rem] uppercase tracking-[0.28em] text-teal-300/60">Pipeline</p>
        <div className="flex flex-wrap gap-2">
          {APPLICATION_STATUSES.map(s => (
            <button
              key={s} type="button" onClick={() => s !== app.status && onStatus(s)} aria-pressed={app.status === s}
              className={`rounded-full border px-3.5 py-1.5 text-xs transition ${
                app.status === s ? STATUS_CLS[s] : 'border-white/10 bg-white/4 text-white/50 hover:border-white/20 hover:text-white'
              }`}
            >
              {APPLICATION_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="application-notes" className="block text-xs uppercase text-white/40 tracking-widest mb-2">Private notes</label>
          <textarea
            id="application-notes" rows={3} value={notes} maxLength={5000} onChange={e => setNotes(e.target.value)}
            placeholder="Only visible to admins"
            className="w-full resize-y rounded-lg border border-white/10 bg-[#041114]/60 px-4 py-2 text-sm text-white/90 placeholder-white/30 focus:border-teal-300/50 focus:outline-none"
          />
          {notesDirty && (
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setNotes(app.notes ?? '')} className="rounded-full px-3 py-1.5 text-xs text-white/50 hover:text-white">Discard</button>
              <button type="button" onClick={() => onNotes(notes)} className="rounded-full bg-teal-300 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-teal-200">Save notes</button>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <AdminButton
          onClick={() => window.open(`mailto:${app.email}?subject=${encodeURIComponent(`Your application for ${app.jobTitle} — RÌNWÁ`)}`)}
          variant="primary" className="flex-1"
        >
          <Mail size={17} className="inline mr-2" />
          Reply via Email
        </AdminButton>
        <button
          type="button" onClick={onDelete} aria-label="Delete application" title="Delete application"
          className="rounded-full border border-white/15 bg-white/5 px-4 text-red-300 transition hover:border-red-400/40 hover:bg-red-600/15"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75 hover:border-teal-300/40">
      {children} <ExternalLink size={11} />
    </a>
  );
}

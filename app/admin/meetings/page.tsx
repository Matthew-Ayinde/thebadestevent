'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, Trash2, ChevronLeft, ChevronRight, Mail, Download, Video, ExternalLink } from 'lucide-react';
import AdminButton from '@/components/admin/AdminButton';
import AdminModal from '@/components/admin/AdminModal';
import AdminTable from '@/components/admin/AdminTable';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';

const PAGE_SIZE = 20;

type Filter = 'all' | 'upcoming' | 'past' | 'pending' | 'cancelled';

const FILTERS: { key: Filter; label: string; empty: string }[] = [
  { key: 'upcoming',  label: 'Upcoming',     empty: 'No upcoming meetings' },
  { key: 'past',      label: 'Past',         empty: 'No past meetings' },
  { key: 'pending',   label: 'Not booked',   empty: 'Everyone who requested a meeting went on to book one' },
  { key: 'cancelled', label: 'Cancelled',    empty: 'No cancelled meetings' },
  { key: 'all',       label: 'All',          empty: 'No meeting requests yet' },
];

function formatSlot(start?: string, end?: string) {
  if (!start) return null;
  const s = new Date(start);
  const day = s.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const time = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return { day, time: end ? `${time(s)} – ${time(new Date(end))}` : time(s) };
}

function statusOf(row: any): { label: string; cls: string } {
  if (row.status === 'cancelled') return { label: 'Cancelled', cls: 'bg-red-400/12 text-red-300 border-red-400/25' };
  if (row.status === 'pending') return { label: 'Not booked', cls: 'bg-amber-300/10 text-amber-200 border-amber-300/25' };
  if (row.startTime && new Date(row.startTime) < new Date()) return { label: 'Past', cls: 'bg-white/8 text-white/55 border-white/12' };
  return { label: 'Upcoming', cls: 'bg-teal-300/12 text-teal-200 border-teal-300/30' };
}

function StatusBadge({ row }: { row: any }) {
  const s = statusOf(row);
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap ${s.cls}`}>{s.label}</span>;
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

export default function MeetingsPage() {
  const [meetings, setMeetings]     = useState<any[]>([]);
  const [counts, setCounts]         = useState<Record<Filter, number>>({ all: 0, upcoming: 0, past: 0, pending: 0, cancelled: 0 });
  const [filter, setFilter]         = useState<Filter>('upcoming');
  const [isLoading, setIsLoading]   = useState(true);
  const [selected, setSelected]     = useState<any | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);

  useEffect(() => { fetch_(page, filter); }, [page, filter]);

  async function fetch_(p: number, f: Filter) {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/meeting-requests?page=${p}&limit=${PAGE_SIZE}&filter=${f}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMeetings(data.meetings || []);
      setCounts(data.counts || counts);
      setPage(data.page || p);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  }

  function changeFilter(f: Filter) {
    setFilter(f);
    setPage(1);
  }

  async function exportCsv() {
    try {
      const res = await fetch(`/api/meeting-requests?page=1&limit=10000&filter=${filter}`);
      if (!res.ok) throw new Error();
      const rows: any[] = (await res.json()).meetings || [];
      if (rows.length === 0) { toast.error('No meetings to export'); return; }

      const cell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const headers = ['Status', 'Name', 'Email', 'Reason', 'Meeting Start', 'Meeting End', 'Guest Timezone', 'Meeting Link', 'Source', 'Requested At'];
      const csvRows = rows.map(r => [
        cell(statusOf(r).label), cell(r.fullName), cell(r.email), cell(r.reason),
        cell(r.startTime ? new Date(r.startTime).toISOString() : ''), cell(r.endTime ? new Date(r.endTime).toISOString() : ''),
        cell(r.timeZone), cell(r.meetingUrl || r.location), cell(r.source === 'cal' ? 'Cal.com' : 'Website'),
        cell(new Date(r.createdAt).toISOString()),
      ].join(','));

      const csv = [headers.map(h => `"${h}"`).join(','), ...csvRows].join('\r\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `rinwa-meetings-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} meeting${rows.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Export failed');
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/meeting-requests/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Meeting record deleted');
      setDeleteId(null);
      await fetch_(page, filter);
    } catch {
      toast.error('Failed to delete meeting record');
    } finally {
      setIsDeleting(false);
    }
  }

  const columns = [
    {
      key: 'fullName',
      label: 'Guest',
      render: (_: any, row: any) => (
        <div className="min-w-0">
          <p className="text-white/90">{row.fullName}</p>
          <p className="text-teal-300/70 text-xs">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (_: any, row: any) => <p className="max-w-xs truncate text-white/60 text-sm">{row.reason || '—'}</p>,
    },
    {
      key: 'startTime',
      label: 'Meeting',
      render: (_: any, row: any) => {
        const slot = formatSlot(row.startTime, row.endTime);
        return slot
          ? <div className="whitespace-nowrap"><p className="text-white/85 text-sm">{slot.day}</p><p className="text-white/45 text-xs">{slot.time}</p></div>
          : <span className="text-white/35">—</span>;
      },
    },
    { key: 'status', label: 'Status', render: (_: any, row: any) => <StatusBadge row={row} /> },
    {
      key: 'createdAt',
      label: 'Requested',
      render: (_: any, row: any) =>
        new Date(row.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <button onClick={() => setSelected(row)} className="p-2 hover:bg-teal-300/20 text-teal-300 rounded-lg transition" aria-label="View meeting">
            <Eye size={16} />
          </button>
          <button onClick={() => setDeleteId(row._id)} className="p-2 hover:bg-red-600/20 text-red-400 rounded-lg transition" aria-label="Delete meeting">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const activeFilter = FILTERS.find(f => f.key === filter)!;
  const selectedSlot = selected && formatSlot(selected.startTime, selected.endTime);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 md:mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-4xl text-white/90">Meetings</h1>
          <p className="text-white/50 mt-1 md:mt-2 text-sm md:text-base">
            Meetings booked with Rinwa, and requests that haven&apos;t been booked yet
          </p>
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

      {/* Filters */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => changeFilter(f.key)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
              filter === f.key
                ? 'border-teal-300/60 bg-teal-300/14 text-teal-200'
                : 'border-white/10 bg-white/4 text-white/55 hover:border-white/20 hover:text-white'
            }`}
          >
            {f.label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${filter === f.key ? 'bg-teal-300/20' : 'bg-white/8'}`}>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : meetings.length === 0 ? (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-[1.8rem]">
          <p className="text-white/40 text-sm">{activeFilter.empty}</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-[1.8rem] p-4 md:p-6 backdrop-blur-sm">
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {meetings.map(row => {
              const slot = formatSlot(row.startTime, row.endTime);
              return (
                <div key={row._id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white/90 font-medium truncate">{row.fullName}</p>
                        <StatusBadge row={row} />
                      </div>
                      <p className="text-teal-300/80 text-xs mt-0.5 truncate">{row.email}</p>
                      {slot && <p className="text-white/70 text-xs mt-2">{slot.day} · {slot.time}</p>}
                      {row.reason && <p className="text-white/40 text-xs mt-1 line-clamp-2">{row.reason}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setSelected(row)} className="p-2 hover:bg-teal-300/20 text-teal-300 rounded-lg transition" aria-label="View meeting">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => setDeleteId(row._id)} className="p-2 hover:bg-red-600/20 text-red-400 rounded-lg transition" aria-label="Delete meeting">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <AdminTable columns={columns} data={meetings} />
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
      <AdminModal isOpen={!!selected} onClose={() => setSelected(null)} title="Meeting Details">
        {selected && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-serif text-xl text-white/90">{selected.fullName}</p>
                  <a href={`mailto:${selected.email}`} className="text-sm text-teal-300/80 hover:text-teal-200 break-all">{selected.email}</a>
                </div>
                <StatusBadge row={selected} />
              </div>
              <Detail label="Reason for the meeting">{selected.reason}</Detail>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-4">
              <p className="text-[0.6rem] uppercase tracking-[0.28em] text-teal-300/60">Booking</p>
              {selectedSlot ? (
                <>
                  <Detail label="When">{`${selectedSlot.day}\n${selectedSlot.time} (your time)`}</Detail>
                  <Detail label="Guest timezone">{selected.timeZone}</Detail>
                  <Detail label="Event">{selected.eventTitle}</Detail>
                  {selected.meetingUrl ? (
                    <Detail label="Meeting link">
                      <a href={selected.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-teal-300 hover:text-teal-200">
                        <Video size={14} /> Join meeting <ExternalLink size={12} />
                      </a>
                    </Detail>
                  ) : (
                    <Detail label="Location">{selected.location}</Detail>
                  )}
                </>
              ) : (
                <p className="text-sm text-white/50">
                  {selected.status === 'pending'
                    ? 'This guest shared their details but hasn’t picked a time yet. A personal follow-up may help.'
                    : 'No time recorded for this booking.'}
                </p>
              )}
              <Detail label="Cancellation reason">{selected.cancellationReason}</Detail>
              <Detail label="Source">{selected.source === 'cal' ? 'Booked directly on Cal.com' : 'Website booking flow'}</Detail>
              <Detail label="Requested">
                {new Date(selected.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              </Detail>
            </div>

            <div className="pt-2">
              <AdminButton onClick={() => window.open(`mailto:${selected.email}?subject=Re: Your meeting with RÌNWÁ`)} variant="primary" className="w-full">
                <Mail size={17} className="inline mr-2" />
                Reply via Email
              </AdminButton>
            </div>
          </div>
        )}
      </AdminModal>

      <ConfirmationDialog
        isOpen={!!deleteId}
        title="Delete Meeting Record"
        message="This removes the record from the admin console only. It does not cancel the booking in Cal.com."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

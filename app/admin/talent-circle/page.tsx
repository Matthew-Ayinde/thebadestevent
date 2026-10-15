'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Eye, Mail, MessageCircle, Trash2 } from 'lucide-react';
import AdminButton from '@/components/admin/AdminButton';
import AdminModal from '@/components/admin/AdminModal';
import AdminTable from '@/components/admin/AdminTable';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';
import { TALENT_CRAFTS } from '@/lib/careers';

const PAGE_SIZE = 20;

const fmtDate = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// WhatsApp links need the number in international form with digits only.
const waLink = (number: string) => {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits.startsWith('0') ? `234${digits.slice(1)}` : digits}`;
};

export default function TalentCirclePage() {
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [craft, setCraft] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchMembers(page, craft);
  }, [page, craft]);

  async function fetchMembers(p: number, c: string) {
    try {
      setIsLoading(true);
      const qs = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE), ...(c ? { craft: c } : {}) });
      const res = await fetch(`/api/talent-circle?${qs}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMembers(data.members || []);
      setPage(data.page || p);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to fetch the talent circle');
    } finally {
      setIsLoading(false);
    }
  }

  async function open(member: any) {
    setSelected(member);
    if (member.isRead) return;
    const res = await fetch(`/api/talent-circle/${member._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    });
    if (res.ok) setMembers(list => list.map(m => (m._id === member._id ? { ...m, isRead: true } : m)));
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/talent-circle/${deleteConfirm}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Removed from the talent circle');
      setDeleteConfirm(null);
      setSelected(null);
      await fetchMembers(page, craft);
    } catch {
      toast.error('Failed to remove');
    } finally {
      setIsDeleting(false);
    }
  }

  const actions = (row: any) => (
    <div className="flex gap-1">
      <button onClick={() => open(row)} aria-label={`View ${row.fullName}`} className="p-2 hover:bg-teal-300/20 text-teal-300 rounded-lg transition">
        <Eye size={16} />
      </button>
      <button onClick={() => setDeleteConfirm(row._id)} aria-label={`Remove ${row.fullName}`} className="p-2 hover:bg-red-600/20 text-red-400 rounded-lg transition">
        <Trash2 size={16} />
      </button>
    </div>
  );

  const name = (row: any) => (
    <span className="flex items-center gap-2">
      {!row.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-teal-300" aria-label="New" />}
      <span className="text-white/90">{row.fullName}</span>
    </span>
  );

  const columns = [
    { key: 'fullName', label: 'Name', render: (_: any, row: any) => name(row) },
    { key: 'crafts', label: 'Craft', render: (v: string[]) => v?.join(', ') || '—' },
    { key: 'currentRole', label: 'Role', render: (v: string) => v || '—' },
    { key: 'experience', label: 'Experience' },
    { key: 'city', label: 'City' },
    { key: 'updatedAt', label: 'Joined', render: (v: string) => fmtDate(v) },
    { key: 'actions', label: 'Actions', render: (_: any, row: any) => actions(row) },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="font-serif text-2xl sm:text-4xl text-white/90">Talent Circle</h1>
        <p className="text-white/50 mt-1 md:mt-2 text-sm md:text-base">
          People who joined from the careers page to hear about roles before they&apos;re posted
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {['', ...TALENT_CRAFTS].map(c => (
          <button
            key={c || 'all'}
            onClick={() => { setCraft(c); setPage(1); }}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              craft === c ? 'border-teal-300 bg-teal-300/15 text-teal-100' : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            {c || 'Everyone'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : members.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/50">{craft ? `No one in ${craft} yet` : 'No one has joined yet'}</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-[1.8rem] p-4 md:p-6 backdrop-blur-sm">
          <div className="md:hidden space-y-3">
            {members.map(row => (
              <div key={row._id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{name(row)}</p>
                    <p className="text-teal-300/80 text-xs mt-0.5 truncate">{row.crafts?.join(', ')}</p>
                    <p className="text-white/50 text-xs mt-1">{[row.currentRole, row.city].filter(Boolean).join(' · ')}</p>
                  </div>
                  {actions(row)}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <AdminTable columns={columns} data={members} />
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/50">
              {`Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, total)} of ${total}`}
            </p>
            <div className="flex items-center gap-2">
              <AdminButton variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-4! py-2! flex items-center gap-2">
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Previous</span>
              </AdminButton>
              <span className="text-sm text-white/60 px-1">{page} / {totalPages}</span>
              <AdminButton variant="secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-4! py-2! flex items-center gap-2">
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={16} />
              </AdminButton>
            </div>
          </div>
        </div>
      )}

      <AdminModal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.fullName ?? 'Talent circle'}>
        {selected && (
          <div className="space-y-4">
            <Detail label="Email">
              <a href={`mailto:${selected.email}`} className="text-teal-300 hover:text-teal-200 break-all">{selected.email}</a>
            </Detail>
            <Detail label="WhatsApp">{selected.whatsapp}</Detail>
            <Detail label="City">{selected.city}</Detail>
            <Detail label="Craft"><Tags items={selected.crafts} /></Detail>
            {selected.currentRole && <Detail label="Current or most recent role">{selected.currentRole}</Detail>}
            <Detail label="Years in hospitality">{selected.experience}</Detail>
            <Detail label="Looking for"><Tags items={selected.lookingFor} /></Detail>
            <Detail label="Could start">{selected.startWhen}</Detail>
            {selected.link && (
              <Detail label="Their work">
                <a href={selected.link} target="_blank" rel="noopener noreferrer" className="text-teal-300 hover:text-teal-200 break-all">{selected.link}</a>
              </Detail>
            )}
            {selected.moment && <Detail label="A moment they made unforgettable"><span className="whitespace-pre-line">{selected.moment}</span></Detail>}
            {selected.dreamMove && <Detail label="Dream move">{selected.dreamMove}</Detail>}
            <Detail label="Joined">{fmtDate(selected.createdAt)}{selected.updatedAt !== selected.createdAt && ` · updated ${fmtDate(selected.updatedAt)}`}</Detail>

            <div className="pt-4 border-t border-white/10 grid gap-3 sm:grid-cols-2">
              <AdminButton onClick={() => window.open(`mailto:${selected.email}`)} variant="primary" className="w-full">
                <Mail size={18} className="inline mr-2" />
                Email
              </AdminButton>
              <AdminButton onClick={() => window.open(waLink(selected.whatsapp), '_blank', 'noopener')} variant="secondary" className="w-full">
                <MessageCircle size={18} className="inline mr-2" />
                WhatsApp
              </AdminButton>
            </div>
          </div>
        )}
      </AdminModal>

      <ConfirmationDialog
        isOpen={!!deleteConfirm}
        title="Remove from talent circle"
        message="This permanently deletes their details. This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase text-white/50 tracking-widest mb-1">{label}</p>
      <div className="text-white/90">{children}</div>
    </div>
  );
}

function Tags({ items }: { items?: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(items ?? []).map(item => (
        <span key={item} className="px-3 py-1 bg-teal-300/15 text-teal-200 rounded-full text-sm">{item}</span>
      ))}
    </div>
  );
}

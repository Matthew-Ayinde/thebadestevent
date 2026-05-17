'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, Trash2, Mail } from 'lucide-react';
import AdminButton from '@/components/admin/AdminButton';
import AdminModal from '@/components/admin/AdminModal';
import AdminTable from '@/components/admin/AdminTable';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  async function fetchSubmissions() {
    try {
      setIsLoading(true);
      const res = await fetch('/api/submissions');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch (error) {
      toast.error('Failed to fetch submissions');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/submissions/${deleteConfirm}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      toast.success('Submission deleted');
      setDeleteConfirm(null);
      await fetchSubmissions();
    } catch (error) {
      toast.error('Failed to delete submission');
    } finally {
      setIsDeleting(false);
    }
  }

  const columns = [
    { key: 'fullName', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'company', label: 'Company', sortable: true },
    {
      key: 'industry',
      label: 'Industry',
      render: (_: any, row: any) => (row.industries?.length ? row.industries.join(', ') : row.industry || '—'),
    },
    { key: 'estimatedBudget', label: 'Budget (₦)' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedSubmission(row)}
            className="p-2 hover:bg-teal-300/20 text-teal-300 rounded-lg transition"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => setDeleteConfirm(row._id)}
            className="p-2 hover:bg-red-600/20 text-red-400 rounded-lg transition"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-4xl text-white/90">Form Submissions</h1>
        <p className="text-white/50 mt-2">View and manage contact form submissions</p>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : submissions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/50">No submissions yet</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-[1.8rem] p-6 backdrop-blur-sm overflow-hidden">
          <AdminTable columns={columns} data={submissions} />
        </div>
      )}

      {/* Detail Modal */}
      <AdminModal
        isOpen={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        title="Submission Details"
      >
        {selectedSubmission && (
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase text-white/50 tracking-widest mb-1">Full Name</p>
              <p className="text-white/90">{selectedSubmission.fullName}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-white/50 tracking-widest mb-1">Email</p>
              <a href={`mailto:${selectedSubmission.email}`} className="text-teal-300 hover:text-teal-200">
                {selectedSubmission.email}
              </a>
            </div>
            <div>
              <p className="text-xs uppercase text-white/50 tracking-widest mb-1">Phone</p>
              <p className="text-white/90">{selectedSubmission.phone}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-white/50 tracking-widest mb-1">Company</p>
              <p className="text-white/90">{selectedSubmission.company}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-white/50 tracking-widest mb-1">Industry</p>
              <div className="flex flex-wrap gap-2">
                {(selectedSubmission.industries?.length
                  ? selectedSubmission.industries
                  : selectedSubmission.industry
                    ? [selectedSubmission.industry]
                    : []
                ).map((item: string) => (
                  <span key={item} className="px-3 py-1 bg-teal-300/15 text-teal-200 rounded-full text-sm">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-white/50 tracking-widest mb-1">Project Date</p>
              <p className="text-white/90">{selectedSubmission.projectDate}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-white/50 tracking-widest mb-1">Budget</p>
              <p className="text-white/90">₦{selectedSubmission.estimatedBudget.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-white/50 tracking-widest mb-1">Description</p>
              <p className="text-white/90">{selectedSubmission.description}</p>
            </div>
            {selectedSubmission.goals && selectedSubmission.goals.length > 0 && (
              <div>
                <p className="text-xs uppercase text-white/50 tracking-widest mb-2">Goals</p>
                <div className="flex flex-wrap gap-2">
                  {selectedSubmission.goals.map((goal: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-teal-300/15 text-teal-200 rounded-full text-sm">
                      {goal}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-white/10">
              <AdminButton
                onClick={() => window.open(`mailto:${selectedSubmission.email}`)}
                variant="primary"
                className="w-full"
              >
                <Mail size={18} className="inline mr-2" />
                Reply via Email
              </AdminButton>
            </div>
          </div>
        )}
      </AdminModal>

      <ConfirmationDialog
        isOpen={!!deleteConfirm}
        title="Delete Submission"
        message="Are you sure you want to delete this submission? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

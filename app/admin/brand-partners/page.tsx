'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import AdminButton from '@/components/admin/AdminButton';
import AdminInput from '@/components/admin/AdminInput';
import AdminSelect from '@/components/admin/AdminSelect';
import AdminModal from '@/components/admin/AdminModal';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';

const BrandPartnerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  logoUrl: z.string().url('Invalid logo URL'),
  region: z.enum(['Lagos', 'Canada', 'Hospitality', 'Other']),
  link: z.string().url('Invalid URL').optional().or(z.literal('')),
  order: z.number().min(0).optional(),
});

type BrandPartnerFormData = z.infer<typeof BrandPartnerSchema>;

export default function BrandPartnersPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<BrandPartnerFormData>({
    resolver: zodResolver(BrandPartnerSchema),
    defaultValues: { order: 0 },
  });

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    if (editingId && partners.length > 0) {
      const partner = partners.find((p) => p._id === editingId);
      if (partner) {
        setTimeout(() => {
          reset({
            name: partner.name,
            logoUrl: partner.logoUrl,
            region: partner.region,
            link: partner.link || '',
            order: partner.order || 0,
          });
        }, 0);
      }
    }
  }, [editingId, partners, reset]);

  async function fetchPartners() {
    try {
      setIsLoading(true);
      const res = await fetch('/api/brand-partners');
      const data = await res.json();
      setPartners(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch brand partners');
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(data: BrandPartnerFormData) {
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/brand-partners/${editingId}` : '/api/brand-partners';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save partner');
      }

      toast.success(editingId ? 'Partner updated' : 'Partner created');
      setIsModalOpen(false);
      setEditingId(null);
      reset();
      await fetchPartners();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/brand-partners/${deleteConfirm}`, { method: 'DELETE' });

      if (!res.ok) throw new Error('Failed to delete');

      toast.success('Partner deleted');
      setDeleteConfirm(null);
      await fetchPartners();
    } catch (error) {
      toast.error('Failed to delete partner');
    } finally {
      setIsDeleting(false);
    }
  }

  function openEditModal(partner: any) {
    setEditingId(partner._id);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    reset();
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="font-serif text-4xl text-white/90">Brand Partners</h1>
          <p className="text-white/50 mt-2">Manage partner logos and information</p>
        </div>
        <AdminButton onClick={() => { reset(); setEditingId(null); setIsModalOpen(true); }} variant="primary">
          <Plus size={18} className="inline mr-2" />
          Add Partner
        </AdminButton>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {partners.map((partner) => (
            <div
              key={partner._id}
              className="bg-white/5 border border-white/10 rounded-[1.8rem] p-6 backdrop-blur-sm hover:border-white/20 transition"
            >
              <img
                src={partner.logoUrl}
                alt={partner.name}
                className="w-full h-24 object-contain mb-4 rounded-lg"
              />
              <h3 className="font-medium text-white/90 mb-1">{partner.name}</h3>
              <p className="text-xs text-white/50 mb-4">{partner.region}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(partner)}
                  className="flex-1 p-2 hover:bg-teal-300/20 text-teal-300 rounded-lg transition text-sm"
                >
                  <Edit2 size={14} className="inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(partner._id)}
                  className="flex-1 p-2 hover:bg-red-600/20 text-red-400 rounded-lg transition text-sm"
                >
                  <Trash2 size={14} className="inline mr-1" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Partner' : 'Add New Partner'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <AdminInput
            label="Partner Name"
            {...register('name')}
            error={errors.name?.message}
            required
          />
          <AdminInput
            label="Logo URL"
            type="url"
            {...register('logoUrl')}
            error={errors.logoUrl?.message}
            required
          />
          <AdminSelect
            label="Region"
            options={[
              { value: 'Lagos', label: 'Lagos' },
              { value: 'Canada', label: 'Canada' },
              { value: 'Hospitality', label: 'Hospitality' },
              { value: 'Other', label: 'Other' },
            ]}
            {...register('region')}
            error={errors.region?.message}
            required
          />
          <AdminInput
            label="Partner Link (optional)"
            type="url"
            {...register('link')}
            error={errors.link?.message}
          />
          <AdminInput
            label="Order"
            type="number"
            {...register('order', { valueAsNumber: true })}
          />

          <div className="flex gap-4">
            <AdminButton type="button" variant="secondary" onClick={closeModal} disabled={isSubmitting}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Partner'}
            </AdminButton>
          </div>
        </form>
      </AdminModal>

      <ConfirmationDialog
        isOpen={!!deleteConfirm}
        title="Delete Partner"
        message="Are you sure you want to delete this partner? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import AdminButton from '@/components/admin/AdminButton';
import AdminInput from '@/components/admin/AdminInput';
import AdminTextarea from '@/components/admin/AdminTextarea';
import AdminModal from '@/components/admin/AdminModal';
import AdminTable from '@/components/admin/AdminTable';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';

const HeroSlideSchema = z.object({
  imageUrl: z.string().url('Invalid image URL'),
  videoUrl: z.string().url('Invalid video URL').optional().or(z.literal('')),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  order: z.number().min(0, 'Order must be positive'),
});

type HeroSlideFormData = z.infer<typeof HeroSlideSchema>;

export default function HeroSlidesPage() {
  const [slides, setSlides] = useState<any[]>([]);
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
  } = useForm<HeroSlideFormData>({
    resolver: zodResolver(HeroSlideSchema),
    defaultValues: { order: 0 },
  });

  useEffect(() => {
    fetchSlides();
  }, []);

  async function fetchSlides() {
    try {
      setIsLoading(true);
      const res = await fetch('/api/hero-slides');
      const data = await res.json();
      setSlides(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch hero slides');
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(data: HeroSlideFormData) {
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/hero-slides/${editingId}` : '/api/hero-slides';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save slide');
      }

      toast.success(editingId ? 'Slide updated' : 'Slide created');
      setIsModalOpen(false);
      setEditingId(null);
      reset();
      await fetchSlides();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/hero-slides/${deleteConfirm}`, { method: 'DELETE' });

      if (!res.ok) throw new Error('Failed to delete');

      toast.success('Slide deleted');
      setDeleteConfirm(null);
      await fetchSlides();
    } catch (error) {
      toast.error('Failed to delete slide');
    } finally {
      setIsDeleting(false);
    }
  }

  function openEditModal(slide: any) {
    setEditingId(slide._id);
    setValue('imageUrl', slide.imageUrl);
    setValue('videoUrl', slide.videoUrl || '');
    setValue('title', slide.title);
    setValue('description', slide.description || '');
    setValue('order', slide.order);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    reset();
  }

  const columns = [
    {
      key: 'imageUrl',
      label: 'Image',
      render: (url: string) => (
        <img src={url} alt="Slide" className="w-16 h-10 rounded object-cover" />
      ),
    },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'order', label: 'Order' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEditModal(row)}
            className="p-2 hover:bg-teal-300/20 text-teal-300 rounded-lg transition"
          >
            <Edit2 size={16} />
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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="font-serif text-4xl text-white/90">Hero Slides</h1>
          <p className="text-white/50 mt-2">Manage carousel slides on the homepage</p>
        </div>
        <AdminButton onClick={() => { reset(); setEditingId(null); setIsModalOpen(true); }} variant="primary">
          <Plus size={18} className="inline mr-2" />
          Add Slide
        </AdminButton>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-[1.8rem] p-6 backdrop-blur-sm overflow-hidden">
          <AdminTable columns={columns} data={slides} />
        </div>
      )}

      <AdminModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Slide' : 'Add New Slide'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <AdminInput
            label="Image URL"
            type="url"
            {...register('imageUrl')}
            error={errors.imageUrl?.message}
            required
          />
          <AdminInput
            label="Video URL (optional)"
            type="url"
            {...register('videoUrl')}
            error={errors.videoUrl?.message}
          />
          <AdminInput
            label="Title"
            {...register('title')}
            error={errors.title?.message}
            required
          />
          <AdminTextarea
            label="Description"
            rows={3}
            {...register('description')}
            error={errors.description?.message}
          />
          <AdminInput
            label="Order"
            type="number"
            {...register('order', { valueAsNumber: true })}
            error={errors.order?.message}
            required
          />

          <div className="flex gap-4">
            <AdminButton type="button" variant="secondary" onClick={closeModal} disabled={isSubmitting}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Slide'}
            </AdminButton>
          </div>
        </form>
      </AdminModal>

      <ConfirmationDialog
        isOpen={!!deleteConfirm}
        title="Delete Slide"
        message="Are you sure you want to delete this slide? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

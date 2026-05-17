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
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';

const TestimonialSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  details: z
    .string()
    .min(1, 'Details are required')
    .max(300, 'Details must be 300 characters or less'),
  initials: z.string().min(1).max(2),
  order: z.number().optional(),
});

type TestimonialForm = z.infer<typeof TestimonialSchema>;

export default function TestimonialsPage() {
  const [items, setItems] = useState<any[]>([]);
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
    watch,
  } = useForm<TestimonialForm>({
    resolver: zodResolver(TestimonialSchema),
  });

  const nameValue = watch('name');
  const detailsValue = watch('details') ?? '';

  useEffect(() => {
    if (nameValue) {
      const parts = nameValue.trim().split(' ');
      const initials = (parts[0]?.slice(0, 2) || '').toUpperCase();
      setValue('initials', initials);
    }
  }, [nameValue, setValue]);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      setIsLoading(true);
      const res = await fetch('/api/testimonials');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch testimonials');
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(data: TestimonialForm) {
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `/api/testimonials/${editingId}`
        : '/api/testimonials';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save testimonial');
      }

      toast.success(editingId ? 'Testimonial updated' : 'Testimonial created');
      setIsModalOpen(false);
      setEditingId(null);
      reset();
      await fetchItems();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'An error occurred'
      );
    }
  }

  function openEdit(item: any) {
    setEditingId(item._id);
    setValue('name', item.name);
    setValue('details', item.details);
    setValue('initials', item.initials);
    setValue('order', item.order || 0);
    setIsModalOpen(true);
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/testimonials/${deleteConfirm}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Testimonial deleted');
      setDeleteConfirm(null);
      await fetchItems();
    } catch (error) {
      toast.error('Failed to delete testimonial');
    } finally {
      setIsDeleting(false);
    }
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
          <h1 className="font-serif text-4xl text-white/90">Testimonials</h1>
          <p className="text-white/50 mt-2">Manage site testimonials</p>
        </div>
        <AdminButton
          onClick={() => {
            reset();
            setEditingId(null);
            setIsModalOpen(true);
          }}
          variant="primary"
        >
          <Plus size={18} className="inline mr-2" />
          Add Testimonial
        </AdminButton>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item._id}
              className="bg-white/5 border border-white/10 rounded-[1.8rem] p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-teal-300 flex items-center justify-center text-slate-900 font-semibold">
                  {item.initials}
                </div>
                <div className="flex-1">
                  <h3 className="text-white/90 font-medium">{item.name}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(item)}
                    className="p-2 hover:bg-teal-300/20 text-teal-300 rounded-lg transition"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(item._id)}
                    className="p-2 hover:bg-red-600/20 text-red-400 rounded-lg transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="text-white/70">{item.details}</p>
            </div>
          ))}
        </div>
      )}

      <AdminModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Testimonial' : 'Add Testimonial'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <AdminInput
            label="Name"
            {...register('name')}
            error={errors.name?.message}
            required
          />
          <AdminTextarea
            label="Details"
            {...register('details')}
            error={errors.details?.message}
            required
            maxLength={300}
            charCount={detailsValue.length}
          />
          <AdminInput
            label="Initials (auto)"
            {...register('initials')}
            error={errors.initials?.message}
            required
          />

          <div className="flex gap-4 pt-4 border-t border-white/10">
            <AdminButton type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" variant="primary" className="flex-1">
              {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </AdminButton>
          </div>
        </form>
      </AdminModal>

      <ConfirmationDialog
        isOpen={!!deleteConfirm}
        title="Delete Testimonial"
        message="Are you sure?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
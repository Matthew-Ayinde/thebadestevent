'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import AdminButton from '@/components/admin/AdminButton';
import AdminInput from '@/components/admin/AdminInput';
import AdminModal from '@/components/admin/AdminModal';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';
import ImageUploader from '@/components/admin/ImageUploader';

export default function MediaPage() {
  const [media, setMedia] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  async function fetchMedia() {
    try {
      setIsLoading(true);
      const res = await fetch('/api/media');
      const data = await res.json();
      setMedia(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch media');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveMedia() {
    if (!imageUrl) {
      toast.error('Image URL is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/media/${editingId}` : '/api/media';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          caption,
          order: media.length,
        }),
      });

      if (!res.ok) throw new Error('Failed to save media');

      toast.success(editingId ? 'Media updated' : 'Media added');
      setImageUrl('');
      setCaption('');
      setEditingId(null);
      setIsModalOpen(false);
      await fetchMedia();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/media/${deleteConfirm}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      toast.success('Media deleted');
      setDeleteConfirm(null);
      await fetchMedia();
    } catch (error) {
      toast.error('Failed to delete media');
    } finally {
      setIsDeleting(false);
    }
  }

  function openEditModal(item: any) {
    setEditingId(item._id);
    setImageUrl(item.imageUrl);
    setCaption(item.caption || '');
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setImageUrl('');
    setCaption('');
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="font-serif text-4xl text-white/90">Media Gallery</h1>
          <p className="text-white/50 mt-2">Manage gallery images</p>
        </div>
        <AdminButton onClick={() => { closeModal(); setIsModalOpen(true); }} variant="primary">
          <Plus size={18} className="inline mr-2" />
          Add Media
        </AdminButton>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {media.map((item) => (
            <div
              key={item._id}
              className="bg-white/5 border border-white/10 rounded-[1.8rem] overflow-hidden backdrop-blur-sm hover:border-white/20 transition group"
            >
              <div className="relative overflow-hidden h-40">
                <img
                  src={item.imageUrl}
                  alt={item.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 bg-teal-500/80 hover:bg-teal-500 text-white rounded-lg transition"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(item._id)}
                    className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {item.caption && (
                <div className="p-4">
                  <p className="text-sm text-white/70">{item.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AdminModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Media' : 'Add New Media'}
      >
        <div className="space-y-6">
          <ImageUploader
            label="Image"
            value={imageUrl}
            onChange={setImageUrl}
            required
          />
          <AdminInput
            label="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Image caption"
          />

          <div className="flex gap-4">
            <AdminButton
              type="button"
              variant="secondary"
              onClick={closeModal}
              disabled={isSubmitting}
            >
              Cancel
            </AdminButton>
            <AdminButton
              type="button"
              variant="primary"
              onClick={handleSaveMedia}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingId ? 'Update Media' : 'Add Media'}
            </AdminButton>
          </div>
        </div>
      </AdminModal>

      <ConfirmationDialog
        isOpen={!!deleteConfirm}
        title="Delete Media"
        message="Are you sure you want to delete this media? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

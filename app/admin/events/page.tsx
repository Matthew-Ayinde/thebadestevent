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
import AdminTextarea from '@/components/admin/AdminTextarea';
import AdminModal from '@/components/admin/AdminModal';
import AdminTable from '@/components/admin/AdminTable';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';

const EventSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  city: z.enum(['Lagos', 'Toronto', 'Vancouver', 'Remote']),
  weekday: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  location: z.string().min(1, 'Location is required'),
  rsvpLink: z.string().url('Invalid URL'),
  imageUrl: z.string().url('Invalid URL'),
  eventType: z.enum(['Dining', 'Community', 'Nightlife', 'Creative', 'Wellness']),
  isFeatured: z.boolean().optional(),
  isPast: z.boolean().optional(),
});

type EventFormData = z.infer<typeof EventSchema>;

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cityFilter, setCityFilter] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<EventFormData>({
    resolver: zodResolver(EventSchema),
  });

  useEffect(() => {
    fetchEvents();
  }, [cityFilter]);

  useEffect(() => {
    if (editingId && events.length > 0) {
      const event = events.find((e) => e._id === editingId);
      if (event) {
        setTimeout(() => {
          reset({
            name: event.name,
            description: event.description,
            city: event.city,
            weekday: event.weekday,
            date: event.date,
            time: event.time,
            location: event.location,
            rsvpLink: event.rsvpLink,
            imageUrl: event.imageUrl,
            eventType: event.eventType,
            isFeatured: event.isFeatured,
            isPast: event.isPast,
          });
        }, 0);
      }
    }
  }, [editingId, events, reset]);

  async function fetchEvents() {
    try {
      setIsLoading(true);
      const url = cityFilter ? `/api/events?city=${cityFilter}` : '/api/events';
      const res = await fetch(url);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(data: EventFormData) {
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/events/${editingId}` : '/api/events';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save event');
      }

      toast.success(editingId ? 'Event updated' : 'Event created');
      setIsModalOpen(false);
      setEditingId(null);
      reset();
      await fetchEvents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/events/${deleteConfirm}`, { method: 'DELETE' });

      if (!res.ok) throw new Error('Failed to delete');

      toast.success('Event deleted');
      setDeleteConfirm(null);
      await fetchEvents();
    } catch (error) {
      toast.error('Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  }

  function openEditModal(event: any) {
    setEditingId(event._id);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    reset();
  }

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'city', label: 'City', sortable: true },
    { key: 'weekday', label: 'Day', sortable: true },
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
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
          <h1 className="font-serif text-4xl text-white/90">Events</h1>
          <p className="text-white/50 mt-2">Manage your upcoming and past events</p>
        </div>
        <AdminButton onClick={() => { reset(); setEditingId(null); setIsModalOpen(true); }} variant="primary">
          <Plus size={18} className="inline mr-2" />
          Add Event
        </AdminButton>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <AdminSelect
          label="Filter by City"
          options={[
            { value: '', label: 'All Cities' },
            { value: 'Lagos', label: 'Lagos' },
            { value: 'Toronto', label: 'Toronto' },
            { value: 'Vancouver', label: 'Vancouver' },
            { value: 'Remote', label: 'Remote' },
          ]}
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-[1.8rem] p-6 backdrop-blur-sm overflow-hidden">
          <AdminTable columns={columns} data={events} />
        </div>
      )}

      {/* Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Event' : 'Add New Event'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <AdminInput
            label="Event Name"
            {...register('name')}
            error={errors.name?.message}
            required
          />
          <AdminTextarea
            label="Description"
            rows={3}
            {...register('description')}
            error={errors.description?.message}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <AdminSelect
              label="City"
              options={[
                { value: 'Lagos', label: 'Lagos' },
                { value: 'Toronto', label: 'Toronto' },
                { value: 'Vancouver', label: 'Vancouver' },
                { value: 'Remote', label: 'Remote' },
              ]}
              {...register('city')}
              error={errors.city?.message}
              required
            />
            <AdminSelect
              label="Weekday"
              options={[
                { value: 'Monday', label: 'Monday' },
                { value: 'Tuesday', label: 'Tuesday' },
                { value: 'Wednesday', label: 'Wednesday' },
                { value: 'Thursday', label: 'Thursday' },
                { value: 'Friday', label: 'Friday' },
                { value: 'Saturday', label: 'Saturday' },
                { value: 'Sunday', label: 'Sunday' },
              ]}
              {...register('weekday')}
              error={errors.weekday?.message}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AdminInput
              label="Date"
              placeholder="April 8th"
              {...register('date')}
              error={errors.date?.message}
              required
            />
            <AdminInput
              label="Time"
              placeholder="6pm-9pm"
              {...register('time')}
              error={errors.time?.message}
              required
            />
          </div>
          <AdminInput
            label="Location"
            placeholder="Address"
            {...register('location')}
            error={errors.location?.message}
            required
          />
          <AdminInput
            label="RSVP Link"
            type="url"
            {...register('rsvpLink')}
            error={errors.rsvpLink?.message}
            required
          />
          <AdminInput
            label="Image URL"
            type="url"
            {...register('imageUrl')}
            error={errors.imageUrl?.message}
            required
          />
          <AdminSelect
            label="Event Type"
            options={[
              { value: 'Dining', label: 'Dining' },
              { value: 'Community', label: 'Community' },
              { value: 'Nightlife', label: 'Nightlife' },
              { value: 'Creative', label: 'Creative' },
              { value: 'Wellness', label: 'Wellness' },
            ]}
            {...register('eventType')}
            error={errors.eventType?.message}
            required
          />

          <div className="flex gap-4">
            <AdminButton type="button" variant="secondary" onClick={closeModal} disabled={isSubmitting}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Event'}
            </AdminButton>
          </div>
        </form>
      </AdminModal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!deleteConfirm}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

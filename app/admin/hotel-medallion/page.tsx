'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, Edit2, ExternalLink, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import AdminButton from '@/components/admin/AdminButton';
import AdminInput from '@/components/admin/AdminInput';
import AdminModal from '@/components/admin/AdminModal';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';
import ImageUploader from '@/components/admin/ImageUploader';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import { MEDALLION_BASE_PATH, MEDALLION_EVENT, isMedallionRelaunchOver } from '@/lib/hotel-medallion';
import {
  eventStatus,
  formatEventDate,
  formatEventTime,
  fromLagosLocal,
  toLagosLocal,
  type MedallionEventView,
} from '@/lib/hotel-medallion-events';

type FormState = {
  title: string;
  tagline: string;
  description: string;
  startsAt: string;
  endsAt: string;
  venueName: string;
  venueAddress: string;
  imageUrl: string;
  rsvpUrl: string;
  dressCode: string;
  isPublished: boolean;
};

const EMPTY: FormState = {
  title: '',
  tagline: '',
  description: '',
  startsAt: '',
  endsAt: '',
  venueName: MEDALLION_EVENT.hotel,
  venueAddress: MEDALLION_EVENT.venueAddress,
  imageUrl: '',
  rsvpUrl: '',
  dressCode: '',
  isPublished: false,
};

function toForm(e: MedallionEventView): FormState {
  return {
    title: e.title,
    tagline: e.tagline,
    description: e.description,
    startsAt: toLagosLocal(e.startsAt),
    endsAt: toLagosLocal(e.endsAt),
    venueName: e.venueName,
    venueAddress: e.venueAddress,
    imageUrl: e.imageUrl,
    rsvpUrl: e.rsvpUrl,
    dressCode: e.dressCode,
    isPublished: e.isPublished,
  };
}

const textareaClass =
  'w-full border border-white/10 rounded-lg bg-[#041114]/60 px-4 py-2 text-white/90 placeholder-white/30 transition duration-300 focus:border-teal-300/50 focus:bg-[#07171a] focus:outline-none';
const labelClass = 'block text-xs uppercase tracking-[0.26em] text-white/50 font-medium mb-2';

const STATUS_STYLES = {
  upcoming: 'bg-teal-300/10 text-teal-200 border-teal-300/30',
  live: 'bg-green-400/10 text-green-300 border-green-400/30',
  past: 'bg-white/5 text-white/45 border-white/10',
} as const;

export default function HotelMedallionEventsAdmin() {
  const [events, setEvents] = useState<MedallionEventView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<MedallionEventView | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MedallionEventView | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const now = useMemo(() => new Date(), [events]);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/hotel-medallion/events', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load events');
      setEvents(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  function openCreate() {
    setForm(EMPTY);
    setEditing('new');
  }

  function openEdit(e: MedallionEventView) {
    setForm(toForm(e));
    setEditing(e);
  }

  async function save(payload: FormState, id?: string) {
    const res = await fetch(id ? `/api/hotel-medallion/events/${id}` : '/api/hotel-medallion/events', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save event');
    return data as MedallionEventView;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.startsAt || !form.endsAt) return toast.error('Start and end times are required');
    if (form.endsAt <= form.startsAt) return toast.error('The event must end after it starts');

    setIsSaving(true);
    try {
      await save(form, editing && editing !== 'new' ? editing.id : undefined);
      toast.success(editing === 'new' ? 'Event created' : 'Event updated');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePublished(e: MedallionEventView) {
    setBusyId(e.id);
    try {
      await save({ ...toForm(e), isPublished: !e.isPublished }, e.id);
      toast.success(e.isPublished ? 'Event unpublished' : 'Event is now live on the site');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update event');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/hotel-medallion/events/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
      toast.success('Event deleted');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  }

  const relaunchOver = isMedallionRelaunchOver(now);
  const liveCount = events.filter((e) => e.isPublished && eventStatus(e, now) !== 'past').length;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.32em] text-teal-300/60 mb-2">Microsite</p>
          <h1 className="font-serif text-4xl text-white/90">Hotel Medallion events</h1>
          <p className="text-white/50 mt-2 max-w-xl">
            Published upcoming events appear on{' '}
            <a href={MEDALLION_BASE_PATH} target="_blank" rel="noopener noreferrer" className="text-teal-300 hover:underline">
              {MEDALLION_BASE_PATH}
            </a>{' '}
            and get their own details page. Times are Lagos time (WAT).
          </p>
        </div>
        <AdminButton onClick={openCreate} variant="primary" className="shrink-0">
          <Plus size={18} className="inline mr-2 -mt-0.5" />
          Add event
        </AdminButton>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Relaunch page mode</p>
          <p className="mt-2 font-serif text-xl text-white/90">{relaunchOver ? 'Concluded — showing recap' : 'Live — taking RSVPs'}</p>
          <p className="mt-1 text-xs text-white/40">
            Switches automatically after {MEDALLION_EVENT.dateLabel}, {MEDALLION_EVENT.timeLabel.split(' - ')[1] ?? ''}.
          </p>
        </div>
        <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Visible upcoming events</p>
          <p className="mt-2 font-serif text-xl text-white/90">{liveCount}</p>
          <p className="mt-1 text-xs text-white/40">Published and not yet ended. Once they end, they move to the “Past evenings” archive.</p>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : events.length === 0 ? (
        <div className="rounded-[1.8rem] border border-dashed border-white/15 p-12 text-center">
          <CalendarDays className="mx-auto text-white/30" size={32} />
          <p className="mt-4 font-serif text-xl text-white/80">No events yet</p>
          <p className="mt-1 text-sm text-white/45">Add the next Hotel Medallion event to show it on the microsite.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => {
            const status = eventStatus(e, now);
            return (
              <li
                key={e.id}
                className="flex flex-col gap-4 rounded-[1.4rem] border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center"
              >
                <div className="h-20 w-full shrink-0 overflow-hidden rounded-xl bg-white/5 sm:w-32">
                  {e.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-white/30">No image</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-[0.16em] ${STATUS_STYLES[status]}`}>
                      {status}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-[0.16em] ${
                        e.isPublished ? 'border-teal-300/30 text-teal-200' : 'border-amber-300/30 text-amber-200'
                      }`}
                    >
                      {e.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="mt-2 truncate font-serif text-lg text-white/90">{e.title}</p>
                  <p className="text-sm text-white/50">
                    {formatEventDate(e.startsAt)} · {formatEventTime(e.startsAt, e.endsAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => togglePublished(e)}
                    disabled={busyId === e.id}
                    title={e.isPublished ? 'Unpublish' : 'Publish'}
                    className="p-2 rounded-lg text-white/70 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    {e.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {e.isPublished && (
                    <a
                      href={`${MEDALLION_BASE_PATH}/events/${e.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View on site"
                      className="p-2 rounded-lg text-white/70 transition hover:bg-white/10"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <button onClick={() => openEdit(e)} title="Edit" className="p-2 rounded-lg text-teal-300 transition hover:bg-teal-300/20">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => setDeleteTarget(e)} title="Delete" className="p-2 rounded-lg text-red-400 transition hover:bg-red-600/20">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AdminModal
        isOpen={editing !== null}
        onClose={() => !isSaving && setEditing(null)}
        title={editing === 'new' ? 'New Hotel Medallion event' : 'Edit event'}
        size="xl"
      >
        <form onSubmit={onSubmit} className="space-y-5">
          <AdminInput label="Title" name="title" value={form.title} onChange={(e) => set('title', e.target.value)} required maxLength={120} />
          <AdminInput
            label="Tagline"
            name="tagline"
            placeholder="An evening of jazz, small plates and city views"
            value={form.tagline}
            onChange={(e) => set('tagline', e.target.value)}
            maxLength={160}
          />
          <div>
            <label htmlFor="description" className={labelClass}>Description</label>
            <textarea
              id="description"
              rows={5}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Leave a blank line between paragraphs."
              maxLength={5000}
              className={textareaClass}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminInput
              label="Starts (WAT)"
              name="startsAt"
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => {
                const v = e.target.value;
                // Pre-fill a 4-hour slot so the common case is one field.
                setForm((f) => ({ ...f, startsAt: v, endsAt: !f.endsAt || f.endsAt <= v ? toLagosLocal(new Date(fromLagosLocal(v).getTime() + 4 * 3_600_000)) : f.endsAt }));
              }}
              required
            />
            <AdminInput label="Ends (WAT)" name="endsAt" type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminInput label="Venue name" name="venueName" value={form.venueName} onChange={(e) => set('venueName', e.target.value)} />
            <AdminInput label="Dress code" name="dressCode" placeholder="Cocktail attire" value={form.dressCode} onChange={(e) => set('dressCode', e.target.value)} />
          </div>
          <AdminInput label="Venue address" name="venueAddress" value={form.venueAddress} onChange={(e) => set('venueAddress', e.target.value)} />
          <AdminInput
            label="RSVP / ticket link"
            name="rsvpUrl"
            placeholder="https://… or mailto:… (leave empty to use the PR email)"
            value={form.rsvpUrl}
            onChange={(e) => set('rsvpUrl', e.target.value)}
          />
          <ImageUploader
            key={`${editing === 'new' ? 'new' : editing?.id}-${form.imageUrl ? 'set' : 'empty'}`}
            label="Cover image"
            value={form.imageUrl}
            onChange={(url) => set('imageUrl', url)}
          />
          {form.imageUrl && (
            <button type="button" onClick={() => set('imageUrl', '')} className="text-xs text-red-300 hover:underline">
              Remove image
            </button>
          )}
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => set('isPublished', e.target.checked)}
              className="size-4 accent-teal-300"
            />
            Publish on the Hotel Medallion page
          </label>
          <div className="flex gap-3 pt-2">
            <AdminButton type="button" variant="secondary" onClick={() => setEditing(null)} disabled={isSaving}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save event'}
            </AdminButton>
          </div>
        </form>
      </AdminModal>

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        title="Delete event"
        message={`Delete “${deleteTarget?.title ?? ''}”? Its page will stop working. This cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

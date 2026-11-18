import { connectDB } from '@/lib/mongodb';
import { MedallionEvent, type IMedallionEvent } from '@/models/MedallionEvent';
import { MedallionGuest } from '@/models/MedallionGuest';
import { MEDALLION_EVENT } from '@/lib/hotel-medallion';
import type { MedallionEventView } from '@/lib/hotel-medallion-events';

type LeanEvent = Pick<
  IMedallionEvent,
  | 'title'
  | 'slug'
  | 'tagline'
  | 'description'
  | 'startsAt'
  | 'endsAt'
  | 'venueName'
  | 'venueAddress'
  | 'imageUrl'
  | 'rsvpUrl'
  | 'dressCode'
  | 'isPublished'
> & { _id: unknown };

export function toEventView(doc: LeanEvent): MedallionEventView {
  return {
    id: String(doc._id),
    slug: doc.slug,
    title: doc.title,
    tagline: doc.tagline ?? '',
    description: doc.description ?? '',
    startsAt: new Date(doc.startsAt).toISOString(),
    endsAt: new Date(doc.endsAt).toISOString(),
    venueName: doc.venueName || MEDALLION_EVENT.hotel,
    venueAddress: doc.venueAddress || MEDALLION_EVENT.venueAddress,
    imageUrl: doc.imageUrl ?? '',
    rsvpUrl: doc.rsvpUrl ?? '',
    dressCode: doc.dressCode ?? '',
    isPublished: Boolean(doc.isPublished),
  };
}

/** Published events that haven't ended yet, soonest first. Never throws — the page must render without a DB. */
export async function getUpcomingMedallionEvents(limit = 12): Promise<MedallionEventView[]> {
  try {
    await connectDB();
    const docs = await MedallionEvent.find({ isPublished: true, endsAt: { $gt: new Date() } })
      .sort({ startsAt: 1 })
      .limit(limit)
      .lean<LeanEvent[]>();
    return docs.map(toEventView);
  } catch (error) {
    console.error('Hotel Medallion: failed to load upcoming events', error);
    return [];
  }
}

/** Published events that have ended, most recent first — the "Past evenings" archive. Never throws. */
export async function getPastMedallionEvents(limit = 6): Promise<MedallionEventView[]> {
  try {
    await connectDB();
    const docs = await MedallionEvent.find({ isPublished: true, endsAt: { $lte: new Date() } })
      .sort({ startsAt: -1 })
      .limit(limit)
      .lean<LeanEvent[]>();
    return docs.map(toEventView);
  } catch (error) {
    console.error('Hotel Medallion: failed to load past events', error);
    return [];
  }
}

export async function getPublishedMedallionEvent(slug: string): Promise<MedallionEventView | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  try {
    await connectDB();
    const doc = await MedallionEvent.findOne({ slug, isPublished: true }).lean<LeanEvent | null>();
    return doc ? toEventView(doc) : null;
  } catch (error) {
    console.error('Hotel Medallion: failed to load event', error);
    return null;
  }
}

/** Attendance for the relaunch recap. `null` when the DB is unreachable. */
export async function getRelaunchAttendance(): Promise<{ registered: number; attended: number } | null> {
  try {
    await connectDB();
    const [registered, attended] = await Promise.all([
      MedallionGuest.countDocuments(),
      MedallionGuest.countDocuments({ checkedInAt: { $ne: null } }),
    ]);
    return { registered, attended };
  } catch (error) {
    console.error('Hotel Medallion: failed to load attendance', error);
    return null;
  }
}

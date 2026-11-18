import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { fromLagosLocal } from '@/lib/hotel-medallion-events';

const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const optionalUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === '' || /^(https?:\/\/|mailto:)/i.test(v), 'Links must start with https://, http:// or mailto:');

/** Admin form payload. Times arrive as wall-clock Lagos time from datetime-local inputs. */
export const MedallionEventInput = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(120),
    tagline: z.string().trim().max(160).default(''),
    description: z.string().trim().max(5000).default(''),
    startsAt: z.string().regex(LOCAL_DT, 'Start date and time are required'),
    endsAt: z.string().regex(LOCAL_DT, 'End date and time are required'),
    venueName: z.string().trim().max(120).default(''),
    venueAddress: z.string().trim().max(300).default(''),
    imageUrl: optionalUrl.default(''),
    rsvpUrl: optionalUrl.default(''),
    dressCode: z.string().trim().max(120).default(''),
    isPublished: z.boolean().default(false),
  })
  .transform((v) => ({ ...v, startsAt: fromLagosLocal(v.startsAt), endsAt: fromLagosLocal(v.endsAt) }))
  .refine((v) => v.endsAt > v.startsAt, { message: 'The event must end after it starts', path: ['endsAt'] });

export async function isMedallionAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session && (session.user as { role?: string }).role === 'admin');
}

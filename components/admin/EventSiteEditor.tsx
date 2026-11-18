'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AlertTriangle, ArrowLeft, CalendarDays, ExternalLink, Loader2, MapPin, ScanLine } from 'lucide-react';
import AdminInput from '@/components/admin/AdminInput';
import ImageUploader from '@/components/admin/ImageUploader';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import { eventFontVariables } from '@/lib/event-fonts';
import {
  BACKDROPS,
  DEFAULT_THEME,
  HEADING_FONTS,
  HEX_RE,
  THEME_PRESETS,
  TIMEZONES,
  contrastRatio,
  dateToZonedLocal,
  formatEventWhen,
  slugProblem,
  slugify,
  themeStyle,
  zonedLocalToDate,
  type EventSiteView,
  type EventTheme,
  type RsvpMode,
} from '@/lib/event-site';

type Form = {
  slug: string;
  isPublished: boolean;
  brandName: string;
  brandEyebrow: string;
  brandWordmark: string;
  logoUrl: string;
  title: string;
  eyebrow: string;
  headline: string;
  tagline: string;
  invitationLine: string;
  description: string;
  recapMessage: string;
  coverImageUrl: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  venueName: string;
  venueAddress: string;
  mapsQuery: string;
  dressCode: string;
  contactName: string;
  contactEmail: string;
  rsvpMode: RsvpMode;
  rsvpUrl: string;
  codePrefix: string;
  scannerPasscode: string;
  clearScannerPasscode: boolean;
  theme: EventTheme;
};

const EMPTY: Form = {
  slug: '',
  isPublished: false,
  brandName: '',
  brandEyebrow: '',
  brandWordmark: '',
  logoUrl: '',
  title: '',
  eyebrow: '',
  headline: '',
  tagline: '',
  invitationLine: '',
  description: '',
  recapMessage: '',
  coverImageUrl: '',
  timezone: 'Africa/Lagos',
  startsAt: '',
  endsAt: '',
  venueName: '',
  venueAddress: '',
  mapsQuery: '',
  dressCode: '',
  contactName: 'RINWA',
  contactEmail: 'info@rinwahospitality.com',
  rsvpMode: 'builtin',
  rsvpUrl: '',
  codePrefix: 'EV',
  scannerPasscode: '',
  clearScannerPasscode: false,
  theme: DEFAULT_THEME,
};

function toForm(e: EventSiteView): Form {
  return {
    ...EMPTY,
    slug: e.slug,
    isPublished: e.isPublished,
    brandName: e.brandName,
    brandEyebrow: e.brandEyebrow,
    brandWordmark: e.brandWordmark === e.brandName ? '' : e.brandWordmark,
    logoUrl: e.logoUrl,
    title: e.title,
    eyebrow: e.eyebrow,
    headline: e.headline === e.title ? '' : e.headline,
    tagline: e.tagline,
    invitationLine: e.invitationLine,
    description: e.description,
    recapMessage: e.recapMessage,
    coverImageUrl: e.coverImageUrl,
    timezone: e.timezone,
    startsAt: dateToZonedLocal(e.startsAt, e.timezone),
    endsAt: dateToZonedLocal(e.endsAt, e.timezone),
    venueName: e.venueName,
    venueAddress: e.venueAddressLines.join('\n'),
    mapsQuery: e.mapsQuery,
    dressCode: e.dressCode,
    contactName: e.contactName,
    contactEmail: e.contactEmail,
    rsvpMode: e.rsvpMode,
    rsvpUrl: e.rsvpUrl,
    codePrefix: e.codePrefix,
    theme: e.theme,
  };
}

/** Same brand, venue, contact and theme — fresh copy, URL and dates. */
function duplicateOf(e: EventSiteView): Form {
  const base = toForm(e);
  return {
    ...base,
    slug: '',
    isPublished: false,
    title: '',
    eyebrow: '',
    headline: '',
    tagline: '',
    invitationLine: '',
    description: '',
    recapMessage: '',
    coverImageUrl: '',
    startsAt: '',
    endsAt: '',
    rsvpUrl: '',
  };
}

const fieldClass =
  'w-full border border-white/10 rounded-lg bg-[#041114]/60 px-4 py-2 text-white/90 placeholder-white/30 transition duration-300 focus:border-teal-300/50 focus:bg-[#07171a] focus:outline-none';
const labelClass = 'block text-xs uppercase tracking-[0.26em] text-white/50 font-medium mb-2';
const hintClass = 'mt-1 text-xs text-white/35';

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <h2 className="font-serif text-xl text-white/90">{title}</h2>
      {hint && <p className="mt-1 text-sm text-white/45">{hint}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function TextArea({ label, value, onChange, rows = 3, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; hint?: string }) {
  const id = label.toLowerCase().replace(/\W+/g, '-');
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={fieldClass} />
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const valid = HEX_RE.test(value);
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={valid ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
        />
        <input
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          maxLength={7}
          className={`${fieldClass} font-mono ${valid ? '' : 'border-red-400/50'}`}
        />
      </div>
    </div>
  );
}

/** A compact, live rendering of the public page using the current theme. */
function Preview({ form }: { form: Form }) {
  const themeOk = Object.values(form.theme).every((v) => typeof v !== 'string' || !v.startsWith('#') || HEX_RE.test(v));
  const theme = themeOk ? form.theme : DEFAULT_THEME;
  const when = useMemo(() => {
    if (!form.startsAt || !form.endsAt) return 'Date and time';
    try {
      return formatEventWhen({
        startsAt: zonedLocalToDate(form.startsAt, form.timezone).toISOString(),
        endsAt: zonedLocalToDate(form.endsAt, form.timezone).toISOString(),
        timezone: form.timezone,
      });
    } catch {
      return 'Date and time';
    }
  }, [form.startsAt, form.endsAt, form.timezone]);

  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-white/10">
      <div className="flex items-center justify-between bg-black/40 px-4 py-2 text-[0.65rem] uppercase tracking-[0.2em] text-white/40">
        <span>Live preview</span>
        <span className="font-mono normal-case tracking-normal">/{form.slug || 'your-event'}</span>
      </div>
      <div className={`event-site min-h-0! px-6 py-8 text-center ${eventFontVariables}`} data-backdrop={theme.backdrop} style={themeStyle(theme)}>
        {form.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.logoUrl} alt="" className="mx-auto mb-3 h-14 w-14 object-contain" />
        )}
        {form.brandEyebrow && <p className="text-[0.55rem] uppercase tracking-[0.5em] text-(--hm-accent)">{form.brandEyebrow}</p>}
        <p className="font-serif text-2xl uppercase tracking-[0.18em] text-(--hm-cream)">{form.brandWordmark || form.brandName || 'Brand'}</p>
        <div className="mx-auto mt-4 flex items-center justify-center gap-2" aria-hidden>
          <span className="h-px w-8 bg-(--hm-accent)/70" />
          <span className="size-1 rotate-45 bg-(--hm-accent)" />
          <span className="h-px w-8 bg-(--hm-accent)/70" />
        </div>
        {form.eyebrow && <p className="mt-4 text-[0.6rem] uppercase tracking-[0.3em] text-(--hm-mist)">{form.eyebrow}</p>}
        <p className="mt-2 font-serif text-xl italic leading-tight text-(--hm-accent-soft)">{form.headline || form.title || 'Event headline'}</p>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-(--hm-mist)">
          <CalendarDays className="size-3.5 text-(--hm-accent)" aria-hidden /> {when}
        </p>
        {form.venueName && (
          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-(--hm-mist)">
            <MapPin className="size-3.5 text-(--hm-accent)" aria-hidden /> {form.venueName}
          </p>
        )}
        <div className="mt-5 rounded-2xl border border-(--hm-line) bg-(--hm-navy)/70 p-4 text-left">
          <p className="font-serif text-lg text-(--hm-cream)">Reserve your place</p>
          <div className="mt-3 h-9 rounded-lg border border-(--hm-line) bg-(--hm-ink)/70" />
          <div className="mt-3 rounded-full bg-(--hm-accent) py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-(--hm-on-accent)">RSVP</div>
          <p className="mt-2 text-[0.65rem] text-(--hm-dim)">Muted helper text looks like this.</p>
        </div>
      </div>
    </div>
  );
}

export default function EventSiteEditor({ id, fromId }: { id: string | 'new'; fromId?: string }) {
  const router = useRouter();
  const isNew = id === 'new';
  const [form, setForm] = useState<Form | null>(isNew && !fromId ? EMPTY : null);
  const [loaded, setLoaded] = useState<(EventSiteView & { registered?: number }) | null>(null);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const source = isNew ? fromId : id;
    if (!source) return;
    fetch(`/api/event-pages/${source}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load event page');
        if (isNew) {
          setForm(duplicateOf(data));
        } else {
          setLoaded(data);
          setForm(toForm(data));
        }
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to load');
        if (isNew) setForm(EMPTY);
      });
  }, [id, fromId, isNew]);

  if (!form) return <div className="p-8"><LoadingSpinner /></div>;

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const setTheme = <K extends keyof EventTheme>(key: K, value: EventTheme[K]) =>
    setForm((f) => (f ? { ...f, theme: { ...f.theme, [key]: value } } : f));

  const slugError = form.slug ? slugProblem(form.slug) : null;
  const slugLocked = !isNew && (loaded?.registered ?? 0) > 0;
  const colorsValid = [form.theme.background, form.theme.surface, form.theme.text, form.theme.muted].every((c) => HEX_RE.test(c));
  const textContrast = colorsValid ? Math.min(contrastRatio(form.theme.text, form.theme.background), contrastRatio(form.theme.text, form.theme.surface)) : 21;
  const mutedContrast = colorsValid ? contrastRatio(form.theme.muted, form.theme.surface) : 21;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.slug || slugError) return toast.error(slugError || 'Choose a page URL');
    if (!form.startsAt || !form.endsAt) return toast.error('Add the start and end time');
    setSaving(true);
    try {
      const res = await fetch(isNew ? '/api/event-pages' : `/api/event-pages/${id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success(isNew ? 'Event page created' : 'Saved');
      if (isNew) {
        router.replace(`/admin/event-pages/${data.id}`);
      } else {
        setLoaded((l) => ({ ...data, registered: l?.registered }));
        setForm(toForm(data));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/event-pages" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-white/45 hover:text-white/80">
            <ArrowLeft size={14} /> Event pages
          </Link>
          <h1 className="mt-2 font-serif text-3xl text-white/90 sm:text-4xl">{isNew ? 'New event page' : form.title || 'Edit event page'}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isNew && loaded && (
            <>
              <a href={`/${loaded.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10">
                <ExternalLink size={15} /> {loaded.isPublished ? 'View page' : 'Preview draft'}
              </a>
              {loaded.rsvpMode === 'builtin' && (
                <a href={`/${loaded.slug}/scan`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10">
                  <ScanLine size={15} /> Door scanner
                </a>
              )}
            </>
          )}
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-teal-300 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 disabled:opacity-50">
            {saving && <Loader2 size={15} className="animate-spin" />}
            {isNew ? 'Create page' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Section title="Page & publishing">
            <div>
              <label htmlFor="slug" className={labelClass}>Page URL</label>
              <div className="flex items-center overflow-hidden rounded-lg border border-white/10 bg-[#041114]/60 focus-within:border-teal-300/50">
                <span className="shrink-0 pl-4 pr-1 text-white/40">rinwahospitality.com/</span>
                <input
                  id="slug"
                  value={form.slug}
                  disabled={slugLocked}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                  }}
                  placeholder="summer-soiree-2027"
                  className="min-w-0 flex-1 bg-transparent py-2 pr-4 font-mono text-white/90 focus:outline-none disabled:opacity-50"
                />
              </div>
              {slugError ? (
                <p className="mt-1 text-xs text-red-400">{slugError}</p>
              ) : slugLocked ? (
                <p className={hintClass}>Locked — guests have RSVP’d and their tickets link to this URL.</p>
              ) : (
                <p className={hintClass}>Lowercase letters, numbers and dashes.</p>
              )}
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
              <input type="checkbox" checked={form.isPublished} onChange={(e) => set('isPublished', e.target.checked)} className="size-4 accent-teal-300" />
              Published — the page is visible to everyone. Unpublished pages are only visible to signed-in admins; guests’ tickets and the door scanner keep working either way.
            </label>
          </Section>

          <Section title="Brand" hint="Who is hosting. Events with the same brand name link to each other under “More from …”.">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminInput label="Brand / host name" name="brandName" value={form.brandName} required maxLength={80} placeholder="Hotel Medallion" onChange={(e) => set('brandName', e.target.value)} />
              <AdminInput label="Ticket code prefix" name="codePrefix" value={form.codePrefix} maxLength={4} placeholder="HM" onChange={(e) => set('codePrefix', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminInput label="Wordmark small line" name="brandEyebrow" value={form.brandEyebrow} maxLength={40} placeholder="Hotel" onChange={(e) => set('brandEyebrow', e.target.value)} />
              <AdminInput label="Wordmark main line" name="brandWordmark" value={form.brandWordmark} maxLength={60} placeholder={form.brandName || 'Medallion'} onChange={(e) => set('brandWordmark', e.target.value)} />
            </div>
            <ImageUploader key={`logo-${form.logoUrl ? 'set' : 'empty'}`} label="Logo" value={form.logoUrl} onChange={(url) => set('logoUrl', url)} />
            {form.logoUrl && (
              <button type="button" onClick={() => set('logoUrl', '')} className="text-xs text-red-300 hover:underline">Remove logo</button>
            )}
          </Section>

          <Section title="Event copy">
            <AdminInput
              label="Event title"
              name="title"
              value={form.title}
              required
              maxLength={140}
              placeholder="Relaunch — Wings & Wine Cocktail Party"
              onChange={(e) => {
                const title = e.target.value;
                setForm((f) => (f ? { ...f, title, slug: slugTouched ? f.slug : slugify(title) } : f));
              }}
            />
            <AdminInput label="Small line above the headline" name="eyebrow" value={form.eyebrow} maxLength={120} placeholder="You are specially invited to the relaunch" onChange={(e) => set('eyebrow', e.target.value)} />
            <AdminInput label="Headline" name="headline" value={form.headline} maxLength={140} placeholder={form.title || 'Wings & Wine Cocktail Party'} onChange={(e) => set('headline', e.target.value)} />
            <AdminInput label="Tagline" name="tagline" value={form.tagline} maxLength={200} placeholder="An evening of live jazz and small plates" onChange={(e) => set('tagline', e.target.value)} />
            <TextArea label="Invitation sentence" value={form.invitationLine} rows={2} onChange={(v) => set('invitationLine', v)} placeholder="You are specially invited to Hotel Medallion’s Relaunch…" hint="Used on tickets and in the invitation email." />
            <TextArea label="About the event" value={form.description} rows={5} onChange={(v) => set('description', v)} hint="Leave a blank line between paragraphs." />
            <TextArea label="Thank-you message (after the event)" value={form.recapMessage} rows={3} onChange={(v) => set('recapMessage', v)} hint="Shown on the recap once the event ends. Leave blank for a default." />
            <ImageUploader key={`cover-${form.coverImageUrl ? 'set' : 'empty'}`} label="Cover image" value={form.coverImageUrl} onChange={(url) => set('coverImageUrl', url)} />
            {form.coverImageUrl && (
              <button type="button" onClick={() => set('coverImageUrl', '')} className="text-xs text-red-300 hover:underline">Remove cover image</button>
            )}
          </Section>

          <Section title="Date & time" hint="Enter times as they are at the venue.">
            <div>
              <label htmlFor="timezone" className={labelClass}>Time zone</label>
              <select id="timezone" value={form.timezone} onChange={(e) => set('timezone', e.target.value)} className={fieldClass}>
                {TIMEZONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                {!TIMEZONES.some((t) => t.value === form.timezone) && <option value={form.timezone}>{form.timezone}</option>}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminInput
                label="Starts"
                name="startsAt"
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => {
                    if (!f) return f;
                    // Pre-fill a 4-hour slot so the common case is one field.
                    const endsAt = !f.endsAt || f.endsAt <= v
                      ? dateToZonedLocal(new Date(zonedLocalToDate(v, f.timezone).getTime() + 4 * 3_600_000), f.timezone)
                      : f.endsAt;
                    return { ...f, startsAt: v, endsAt };
                  });
                }}
              />
              <AdminInput label="Ends" name="endsAt" type="datetime-local" required value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
            </div>
            <p className={hintClass}>The page switches to its recap automatically when the event ends.</p>
          </Section>

          <Section title="Venue">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminInput label="Venue name" name="venueName" value={form.venueName} maxLength={120} onChange={(e) => set('venueName', e.target.value)} />
              <AdminInput label="Dress code" name="dressCode" value={form.dressCode} maxLength={120} placeholder="Cocktail attire" onChange={(e) => set('dressCode', e.target.value)} />
            </div>
            <TextArea label="Address (one line per row)" value={form.venueAddress} rows={3} onChange={(v) => set('venueAddress', v)} placeholder={'Plot 61, Babatunde Anjous Avenue\nLekki Phase 1\nLagos, Nigeria'} />
            <AdminInput label="Google Maps search (optional)" name="mapsQuery" value={form.mapsQuery} maxLength={300} placeholder="Defaults to venue name + address" onChange={(e) => set('mapsQuery', e.target.value)} />
          </Section>

          <Section title="RSVP & door">
            <div className="grid gap-2 sm:grid-cols-3">
              {([
                ['builtin', 'Built-in RSVP', 'QR tickets, emails & door scanner'],
                ['external', 'External link', 'Eventbrite, Paystack, a form…'],
                ['none', 'No RSVP', 'Information page only'],
              ] as const).map(([value, title, desc]) => (
                // `relative` keeps the visually-hidden radio inside this card; without it the absolutely
                // positioned input escapes the admin's scroll area and stretches the whole page.
                <label key={value} className={`relative cursor-pointer rounded-xl border p-3 text-sm transition focus-within:ring-2 focus-within:ring-teal-300/40 ${form.rsvpMode === value ? 'border-teal-300/60 bg-teal-300/10' : 'border-white/10 bg-white/5 hover:border-white/25'}`}>
                  <input type="radio" name="rsvpMode" value={value} checked={form.rsvpMode === value} onChange={() => set('rsvpMode', value)} className="sr-only" />
                  <span className="block font-medium text-white/90">{title}</span>
                  <span className="mt-0.5 block text-xs text-white/45">{desc}</span>
                </label>
              ))}
            </div>
            {form.rsvpMode === 'external' && (
              <AdminInput label="RSVP / ticket link" name="rsvpUrl" value={form.rsvpUrl} required placeholder="https://…" onChange={(e) => set('rsvpUrl', e.target.value)} />
            )}
            {form.rsvpMode === 'builtin' && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-white/85">Door scanner passcode</p>
                <p className="mt-0.5 text-xs text-white/45">
                  Door staff open <span className="font-mono">/{form.slug || 'your-event'}/scan</span> and enter this to check guests in.{' '}
                  {!isNew && (loaded?.scannerEnabled ? 'A passcode is set — leave blank to keep it.' : 'No passcode set yet, so the scanner is off.')}
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={form.scannerPasscode}
                    onChange={(e) => set('scannerPasscode', e.target.value)}
                    placeholder={loaded?.scannerEnabled ? '•••••• (unchanged)' : 'New passcode (min 4 characters)'}
                    className={`${fieldClass} sm:max-w-xs`}
                    disabled={form.clearScannerPasscode}
                  />
                  {loaded?.scannerEnabled && (
                    <label className="flex items-center gap-2 text-xs text-white/60">
                      <input type="checkbox" checked={form.clearScannerPasscode} onChange={(e) => set('clearScannerPasscode', e.target.checked)} className="accent-red-400" />
                      Turn the scanner off
                    </label>
                  )}
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminInput label="Enquiries contact name" name="contactName" value={form.contactName} maxLength={80} onChange={(e) => set('contactName', e.target.value)} />
              <AdminInput label="Enquiries email" name="contactEmail" type="email" value={form.contactEmail} maxLength={200} onChange={(e) => set('contactEmail', e.target.value)} />
            </div>
          </Section>

          <Section title="Theme" hint="Pick a starting palette, then fine-tune. Other shades are derived automatically.">
            <div className="flex flex-wrap gap-2">
              {THEME_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setForm((f) => (f ? { ...f, theme: { ...f.theme, ...p.theme } } : f))}
                  className="flex items-center gap-2 rounded-full border border-white/15 py-1.5 pl-1.5 pr-3 text-xs text-white/80 hover:border-white/35"
                >
                  <span className="flex overflow-hidden rounded-full">
                    {[p.theme.background, p.theme.surface, p.theme.accent, p.theme.text].map((c) => (
                      <span key={c} className="size-4" style={{ background: c }} />
                    ))}
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <ColorField label="Background" value={form.theme.background} onChange={(v) => setTheme('background', v)} />
              <ColorField label="Cards" value={form.theme.surface} onChange={(v) => setTheme('surface', v)} />
              <ColorField label="Borders" value={form.theme.border} onChange={(v) => setTheme('border', v)} />
              <ColorField label="Accent" value={form.theme.accent} onChange={(v) => setTheme('accent', v)} />
              <ColorField label="Text" value={form.theme.text} onChange={(v) => setTheme('text', v)} />
              <ColorField label="Muted text" value={form.theme.muted} onChange={(v) => setTheme('muted', v)} />
            </div>
            {(textContrast < 4.5 || mutedContrast < 3) && (
              <p className="flex items-start gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-xs text-amber-100">
                <AlertTriangle size={15} className="mt-px shrink-0" />
                {textContrast < 4.5
                  ? `Text may be hard to read on this background (contrast ${textContrast.toFixed(1)}:1, aim for 4.5:1).`
                  : `Muted text is faint on the cards (contrast ${mutedContrast.toFixed(1)}:1, aim for 3:1).`}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="headingFont" className={labelClass}>Heading font</label>
                <select id="headingFont" value={form.theme.headingFont} onChange={(e) => setTheme('headingFont', e.target.value as EventTheme['headingFont'])} className={fieldClass}>
                  {Object.entries(HEADING_FONTS).map(([value, f]) => <option key={value} value={value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="backdrop" className={labelClass}>Background style</label>
                <select id="backdrop" value={form.theme.backdrop} onChange={(e) => setTheme('backdrop', e.target.value as EventTheme['backdrop'])} className={fieldClass}>
                  {Object.entries(BACKDROPS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            </div>
          </Section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Preview form={form} />
          <p className="mt-3 text-xs text-white/35">
            The preview shows colours and type. Save, then use {isNew ? 'the preview link' : '“Preview draft”'} to see the full page.
          </p>
        </aside>
      </div>
    </form>
  );
}

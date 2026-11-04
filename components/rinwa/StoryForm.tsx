"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { forwardRef, useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { ArrowRight, ChevronLeft, ChevronRight, ImagePlus, Instagram, Linkedin, Music2, Twitter, X } from "lucide-react";
import { Area, Field, QuestionBlock, Reveal, SegButtons, inputCls } from "./questionnaire-ui";
import { RinwaStamp } from "./RinwaStamp";
import { useFormAnalytics } from "@/lib/analytics/use-form-analytics";

// Brand palette. Gold is 2.2:1 on paper, so it is for rules and on dark
// backgrounds only, never for text on the form.
const PAPER = "#F3EDE0";
const RUST = "#8C4423";
const TEAL = "#2E6B66";
const GOLD = "#C9983F";
const TEXT = "#22302f";
const INK = TEAL;

const FORM_THEME = {
  "--accent": TEAL,
  "--accent-ink": PAPER,
  "--q-text": TEXT,
  "--q-muted": `${TEXT}c4`,
  "--q-faint": `${TEXT}8c`,
  "--q-line": `${TEXT}33`,
  "--q-fill": "#fbf8f1",
} as React.CSSProperties;

// ─── Types & options ───────────────────────────────────────────────────────────

interface FormData {
  stage: string;
  creditAs: string;
  name: string;
  movedFrom: string;
  yearReturned: string;
  story: string;
  instagram: string; tiktok: string; twitter: string; linkedin: string;
  wantsTag: string;
  wishedHelpWith: string;
  wishPrepared: string;
  landingThoughts: string;
  contentConsent: string;
}

const BLANK: FormData = {
  stage: "",
  creditAs: "", name: "",
  movedFrom: "", yearReturned: "",
  story: "",
  instagram: "", tiktok: "", twitter: "", linkedin: "",
  wantsTag: "",
  wishedHelpWith: "", wishPrepared: "", landingThoughts: "",
  contentConsent: "",
};

const STAGES = [
  { value: "Returned", desc: "I’ve made the move back" },
  { value: "Extended", desc: "I’m here, open-ended, still deciding" },
  { value: "Incoming", desc: "I’m still abroad and weighing it" },
];

// Incoming storytellers haven't come home yet, so the questions and their
// entry are worded differently and there is no year to ask for.
const STAGE_COPY: Record<string, { from: string; fromDesc: string; year: string; entryFrom: string; entryWhen: string }> = {
  Returned: {
    from: "Where did you move back from?",
    fromDesc: "The city and country you were living in before coming home.",
    year: "What year did you come home?",
    entryFrom: "Moved back from",
    entryWhen: "Came home",
  },
  Extended: {
    from: "Where were you living before you came?",
    fromDesc: "The city and country you were living in before this stay.",
    year: "What year did you arrive?",
    entryFrom: "Came from",
    entryWhen: "Arrived",
  },
  Incoming: {
    from: "Where are you living now?",
    fromDesc: "The city and country you're in today.",
    year: "",
    entryFrom: "Living in",
    entryWhen: "Status",
  },
};
const copyFor = (stage: string) => STAGE_COPY[stage] ?? STAGE_COPY.Returned;

const CREDIT = ["Full name", "Nickname", "Anonymous"];
const TAG = ["Yes, tag me", "No, thanks"];
const CONSENT_YES = "Yes, share my story";
const CONSENT = [CONSENT_YES, "Keep it private"];

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1960 + 1 }, (_, i) => String(THIS_YEAR - i));

const STEPS = [
  { tag: "01 — About you",    title: "First, a little about you",  desc: "How you'd like to appear, and where your journey home began." },
  { tag: "02 — Your story",   title: "Now, tell us your story",    desc: "A photo, a few honest words, and where to find you." },
  { tag: "03 — Looking back", title: "Looking back on the move",   desc: "Optional, but these answers shape how we help the next person home." },
];
const TOTAL = STEPS.length;

// Photos are resized in the browser before upload: phone shots are often
// 5–12 MB, well over what a serverless request will accept.
const MAX_EDGE = 1600;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const SENDABLE_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function shrinkPhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) throw new Error("encode failed");
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    // The browser couldn't decode it (e.g. HEIC outside Safari) — send it as-is if the server can take it.
    if (SENDABLE_TYPES.includes(file.type) && file.size <= MAX_UPLOAD_BYTES) return file;
    throw new Error("We couldn't read that photo. Please try a JPG or PNG.");
  }
}

interface Stamped {
  incoming: boolean;
  displayName: string;
  fromLabel: string;
  movedFrom: string;
  whenLabel: string;
  when: string;
  entryNo: string;
  photo: string | null;
  shared: boolean;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

const StoryForm = forwardRef<HTMLDivElement, { onStageChange?: (stage: string) => void }>(function StoryForm({ onStageChange }, ref) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(BLANK);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stamped, setStamped] = useState<Stamped | null>(null);
  const { trackError, trackSubmitError } = useFormAnalytics("feedback", stamped ? TOTAL + 1 : step, TOTAL);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setData(prev => ({ ...prev, [field]: value }));
    if (field === "stage") onStageChange?.(value);
  }

  const hasHandle = !!(data.instagram.trim() || data.tiktok.trim() || data.twitter.trim() || data.linkedin.trim());
  const canTag = data.creditAs !== "Anonymous" && hasHandle;
  const incoming = data.stage === "Incoming";

  function validate(s: number): string | null {
    switch (s) {
      case 1:
        if (!data.stage) return "Let us know where you are right now.";
        if (!data.creditAs) return "Let us know how you'd like to be credited.";
        if (data.creditAs !== "Anonymous" && !data.name.trim())
          return data.creditAs === "Nickname" ? "Please enter your nickname." : "Please enter your full name.";
        if (!data.movedFrom.trim()) return incoming ? "Please tell us where you're living now." : "Please tell us where you moved back from.";
        if (!incoming && !data.yearReturned) return "Please choose the year you came home.";
        return null;
      case 2:
        if (data.story.trim().length < 20) return "Please share a little more of your story.";
        if (canTag && !data.wantsTag) return "Let us know if we can tag you.";
        return null;
      case 3:
        if (!data.contentConsent) return "Please let us know if we can share your story.";
        return null;
      default: return null;
    }
  }

  function scrollToTop() {
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }));
  }

  function next() {
    const error = validate(step);
    if (error) { toast.error(error); trackError(step, error); return; }
    setStep(s => s + 1);
    scrollToTop();
  }

  function back() {
    setStep(s => s - 1);
    scrollToTop();
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
      toast.error("Please choose an image file.");
      return;
    }
    try {
      const small = await shrinkPhoto(file);
      setPhoto(small);
      setPreview(URL.createObjectURL(small));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't use that photo.");
    }
  }

  function clearPhoto() {
    setPhoto(null);
    setPreview(null);
  }

  async function submit() {
    const error = validate(step);
    if (error) { toast.error(error); trackError(step, error); return; }
    try {
      setSubmitting(true);
      const body = new FormData();
      body.append("data", JSON.stringify({
        stage: data.stage,
        creditAs: data.creditAs,
        name: data.creditAs === "Anonymous" ? "" : data.name,
        movedFrom: data.movedFrom,
        yearReturned: incoming ? undefined : Number(data.yearReturned),
        story: data.story,
        instagram: data.instagram, tiktok: data.tiktok, twitter: data.twitter, linkedin: data.linkedin,
        wantsTag: canTag && data.wantsTag === TAG[0],
        wishedHelpWith: data.wishedHelpWith,
        wishPrepared: data.wishPrepared,
        landingThoughts: incoming ? "" : data.landingThoughts,
        contentConsent: data.contentConsent === CONSENT_YES,
      }));
      if (photo) body.append("photo", photo);

      const res = await fetch("/api/ilewa", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Submission failed");

      setStamped({
        incoming,
        displayName: data.creditAs === "Anonymous" ? "Anonymous" : data.name.trim(),
        fromLabel: copyFor(data.stage).entryFrom,
        movedFrom: data.movedFrom.trim(),
        whenLabel: copyFor(data.stage).entryWhen,
        when: incoming ? data.stage : data.yearReturned,
        entryNo: String(json.id ?? "").slice(-6).toUpperCase(),
        photo: preview,
        shared: data.contentConsent === CONSENT_YES,
      });
      scrollToTop();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(message);
      trackSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const meta = step === TOTAL && incoming
    ? { ...STEPS[step - 1], tag: "03 — Looking ahead", title: "Looking ahead to the move" }
    : STEPS[step - 1];
  // Numbering runs on across steps, skipping questions this person isn't asked.
  const storyStart = incoming ? 4 : 5;
  const reflectStart = storyStart + (canTag ? 4 : 3);

  return (
    <div ref={ref} style={FORM_THEME}>
      <Toaster position="top-center" toastOptions={{ style: { background: PAPER, color: TEXT, border: `1px solid ${RUST}66` } }} />
      <div ref={topRef} className="scroll-mt-24" />

      <AnimatePresence mode="wait" initial={false}>
        {stamped ? (
          <motion.div key="stamped" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <StampedEntry entry={stamped} />
          </motion.div>
        ) : (
          <motion.div
            key={`step-${step}`}
            initial={{ opacity: 0, y: reduced ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -14 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-lg p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85)] sm:p-9"
            style={{ background: PAPER }}
          >
            {/* Step header */}
            <div className="mb-5 flex items-center justify-between">
              <p className="text-[0.6rem] uppercase tracking-[0.38em]" style={{ color: RUST }}>{meta.tag}</p>
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-[#22302f]/75">Step {step} of {TOTAL}</p>
            </div>
            <div className="mb-3 flex gap-1.5" aria-hidden>
              {STEPS.map((_, i) => (
                <div key={i} className="h-[2px] flex-1 rounded-full transition-colors duration-500" style={{ background: i < step ? GOLD : `${TEXT}1f` }} />
              ))}
            </div>
            <div className="mb-8 mt-7">
              <h3 className="font-serif text-[clamp(1.7rem,4.5vw,2.6rem)] leading-[1.1] tracking-tight text-[#22302f]" style={{ fontFamily: "var(--font-serif)" }}>
                {meta.title}
              </h3>
              <p className="mt-3 text-[0.9rem] leading-relaxed text-[#22302f]/75">{meta.desc}</p>
            </div>

            <div className="border-t pt-7" style={{ borderColor: `${TEXT}33` }}>
              {step === 1 && <StepAboutYou data={data} set={set} />}
              {step === 2 && (
                <StepYourStory
                  data={data} set={set} canTag={canTag} start={storyStart}
                  preview={preview} onPick={pickPhoto} onClear={clearPhoto}
                />
              )}
              {step === 3 && <StepLookingBack data={data} set={set} start={reflectStart} />}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button" onClick={back} disabled={step === 1}
                className="flex items-center gap-2 rounded-md border border-[#22302f]/25 bg-transparent px-5 py-3 text-sm text-[#22302f]/75 transition-colors hover:border-[#22302f]/50 hover:text-[#22302f] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={14} />
                Back
              </button>
              <button
                type="button" onClick={step < TOTAL ? next : submit} disabled={submitting}
                className="group flex items-center gap-2 rounded-md px-7 py-3.5 text-sm font-semibold transition-[filter] hover:[filter:brightness(1.1)] disabled:cursor-not-allowed disabled:opacity-55"
                style={{ background: TEAL, color: PAPER }}
              >
                {submitting ? "Sending…" : step < TOTAL ? "Continue" : "Submit my story"}
                {!submitting && (step < TOTAL ? <ChevronRight size={14} /> : <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />)}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default StoryForm;

// ─── Steps ─────────────────────────────────────────────────────────────────────

type SetFn = <K extends keyof FormData>(f: K, v: FormData[K]) => void;

function StageChoice({ value, onPick }: { value: string; onPick: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Where are you right now?" className="grid gap-2.5">
      {STAGES.map(s => {
        const active = value === s.value;
        return (
          <label
            key={s.value}
            className="flex cursor-pointer items-center gap-3.5 rounded-md border px-4 py-3.5 text-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2"
            style={{
              borderColor: active ? RUST : "var(--q-line)",
              background: active ? `${RUST}14` : "var(--q-fill)",
              outlineColor: RUST,
            }}
          >
            <input
              type="radio" name="stage" value={s.value} checked={active}
              onChange={() => onPick(s.value)}
              className="sr-only"
            />
            <span
              aria-hidden
              className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border"
              style={{ borderColor: active ? RUST : `${TEXT}73` }}
            >
              {active && <span className="h-2.5 w-2.5 rounded-full" style={{ background: RUST }} />}
            </span>
            <span style={{ color: TEXT }}>
              <span className="font-semibold">{s.value}</span> — {s.desc}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function StepAboutYou({ data, set }: { data: FormData; set: SetFn }) {
  const incoming = data.stage === "Incoming";
  const copy = copyFor(data.stage);
  return (
    <div>
      <QuestionBlock index={1} prompt="Where are you right now?">
        <StageChoice value={data.stage} onPick={v => set("stage", v)} />
      </QuestionBlock>

      <QuestionBlock index={2} prompt="How would you like to be credited?" desc="This is the name we'd use if we share your story.">
        <div>
          <SegButtons options={CREDIT} value={data.creditAs} onPick={v => set("creditAs", v)} />
          <Reveal show={data.creditAs === "Full name" || data.creditAs === "Nickname"}>
            <Field
              label={data.creditAs === "Nickname" ? "Your nickname" : "Your full name"}
              name="name" value={data.name}
              onChange={e => set("name", e.target.value)}
            />
          </Reveal>
          <Reveal show={data.creditAs === "Anonymous"}>
            <p className="text-[0.85rem] leading-relaxed text-[#22302f]/75">
              No problem. Your story will appear without a name, and we won&apos;t tag you anywhere.
            </p>
          </Reveal>
        </div>
      </QuestionBlock>

      <QuestionBlock index={3} prompt={copy.from} desc={copy.fromDesc} last={incoming}>
        <Field label="e.g. Toronto, Canada" name="movedFrom" value={data.movedFrom} onChange={e => set("movedFrom", e.target.value)} />
      </QuestionBlock>

      {!incoming && (
        <QuestionBlock index={4} prompt={copy.year} last>
          <select
            name="yearReturned"
            value={data.yearReturned}
            onChange={e => set("yearReturned", e.target.value)}
            className={`${inputCls} appearance-none cursor-pointer`}
            style={{ backgroundImage: "none", color: data.yearReturned ? undefined : "var(--q-muted)" }}
          >
            <option value="" disabled>Choose a year</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </QuestionBlock>
      )}
    </div>
  );
}

function StepYourStory({
  data, set, canTag, start, preview, onPick, onClear,
}: {
  data: FormData; set: SetFn; canTag: boolean; start: number;
  preview: string | null; onPick: (f: File | undefined) => void; onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const incoming = data.stage === "Incoming";

  return (
    <div>
      <QuestionBlock index={start} prompt="Add a photo from your journey" desc={incoming ? "A throwback from before you left, or a moment from a trip home. Optional." : "A throwback from before you left, or a moment from life back home. Optional."}>
        {preview ? (
          <div className="flex items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img src={preview} alt="Your chosen photo" className="h-28 w-24 rounded-sm object-cover ring-1 ring-[#22302f]/20" />
            <div className="space-y-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="block text-sm font-medium" style={{ color: TEAL }}>
                Choose a different photo
              </button>
              <button type="button" onClick={onClear} className="flex items-center gap-1.5 text-sm text-[#22302f]/75 hover:text-[#22302f]">
                <X size={13} /> Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); onPick(e.dataTransfer.files?.[0]); }}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-9 text-center transition-colors"
            style={{
              borderColor: dragging ? TEAL : `${TEXT}4d`,
              background: dragging ? `${TEAL}10` : "var(--q-fill)",
            }}
          >
            <ImagePlus size={22} style={{ color: TEAL }} />
            <span className="text-sm text-[#22302f]/85">Tap to choose a photo, or drop one here</span>
            <span className="text-xs text-[#22302f]/75">JPG, PNG, WebP or HEIC</span>
          </button>
        )}
        <input
          ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { onPick(e.target.files?.[0]); e.target.value = ""; }}
        />
      </QuestionBlock>

      <QuestionBlock
        index={start + 1}
        prompt={incoming ? "Tell us where you are with the decision" : "Tell us your homecoming story"}
        desc={incoming
          ? "What's pulling you home, and what's holding you back? Write as much or as little as feels right."
          : "What brought you back, and what has it been like since? Write as much or as little as feels right."}
      >
        <div>
          <textarea
            name="story" rows={6} value={data.story}
            onChange={e => set("story", e.target.value)}
            maxLength={4000}
            placeholder={incoming ? "I started thinking about coming home when…" : "I knew it was time to come home when…"}
            className={`${inputCls} min-h-0 resize-y`}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={e => (e.currentTarget.style.borderColor = "")}
          />
          <p className="mt-1.5 text-right text-[0.68rem] tabular-nums text-[#22302f]/75">{data.story.length} / 4000</p>
        </div>
      </QuestionBlock>

      <QuestionBlock index={start + 2} prompt="Where can people find you online?" desc="Optional. Add any handles you're happy to share." last={!canTag}>
        <div className="grid gap-3 sm:grid-cols-2">
          <HandleInput icon={<Instagram size={15} />} label="Instagram" value={data.instagram} onChange={v => set("instagram", v)} />
          <HandleInput icon={<Music2 size={15} />} label="TikTok" value={data.tiktok} onChange={v => set("tiktok", v)} />
          <HandleInput icon={<Twitter size={15} />} label="X (Twitter)" value={data.twitter} onChange={v => set("twitter", v)} />
          <HandleInput icon={<Linkedin size={15} />} label="LinkedIn" value={data.linkedin} onChange={v => set("linkedin", v)} />
        </div>
      </QuestionBlock>

      <Reveal show={canTag}>
        <QuestionBlock index={start + 3} prompt="Can we tag you when we share your story?" last>
          <SegButtons options={TAG} value={data.wantsTag} onPick={v => set("wantsTag", v)} />
        </QuestionBlock>
      </Reveal>
    </div>
  );
}

function HandleInput({ icon, label, value, onChange }: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative block">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#22302f]/75">{icon}</span>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={label} aria-label={`${label} handle`}
        autoCapitalize="none" autoCorrect="off" spellCheck={false}
        className={`${inputCls} pl-11`}
        onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
        onBlur={e => (e.currentTarget.style.borderColor = "")}
      />
    </label>
  );
}

function StepLookingBack({ data, set, start }: { data: FormData; set: SetFn; start: number }) {
  const incoming = data.stage === "Incoming";
  return (
    <div>
      <QuestionBlock
        index={start}
        prompt={incoming
          ? "If you had one trusted person, service or platform in your corner, what would you want help with?"
          : "If you'd had one trusted person, service or platform in your corner, what would you have wanted help with?"}
      >
        <Area label="Your answer" name="wishedHelpWith" value={data.wishedHelpWith} onChange={e => set("wishedHelpWith", e.target.value)} placeholder="Finding a place to live, schools, paperwork, making friends…" />
      </QuestionBlock>

      <QuestionBlock
        index={start + 1}
        prompt={incoming
          ? "What's one thing about coming home you'd want someone to prepare you for?"
          : "What's one thing about coming home you wish someone had prepared you for?"}
      >
        <Area label="Your answer" name="wishPrepared" value={data.wishPrepared} onChange={e => set("wishPrepared", e.target.value)} placeholder={incoming ? "I'd want to know…" : "Nobody told me…"} />
      </QuestionBlock>

      {!incoming && (
        <QuestionBlock index={start + 2} prompt="Take us back to the moment you landed. What was going through your mind?">
          <Area label="Your answer" name="landingThoughts" value={data.landingThoughts} onChange={e => set("landingThoughts", e.target.value)} placeholder="The heat hit me first, then…" />
        </QuestionBlock>
      )}

      <QuestionBlock
        index={start + (incoming ? 2 : 3)}
        prompt="Can RÌNWÁ share your story?"
        desc="With your permission, we may feature your story and photo on our website, social media and other RÌNWÁ content, credited the way you chose above. You can ask us to take it down at any time. If you'd rather keep it private, we'll only use your answers to improve how we support people coming home."
        last
      >
        <SegButtons options={CONSENT} value={data.contentConsent} onPick={v => set("contentConsent", v)} />
        <p className="mt-4 text-[0.8rem] leading-relaxed text-[#22302f]/75">
          Read how we handle your story and photo in our{" "}
          <Link href="/privacy#stories" target="_blank" className="underline underline-offset-4 hover:text-[#22302f]">
            privacy policy
          </Link>
          .
        </p>
      </QuestionBlock>
    </div>
  );
}

// ─── Stamped entry ─────────────────────────────────────────────────────────────
// The thank-you moment: their answers appear as an entry on a cream passport
// page, then the Came Home seal drops from above, slams down with a shake and
// a ring of ink, and settles slightly crooked — like a real border stamp.

const DROP_DELAY = 0.9;
const DROP_DURATION = 0.42;

function StampedEntry({ entry }: { entry: Stamped }) {
  const reduced = useReducedMotion();
  const sealLabel = entry.incoming ? "On the way home" : "Came Home";
  const impact = DROP_DELAY + DROP_DURATION;

  useEffect(() => {
    if (reduced) return;
    const t = window.setTimeout(() => navigator.vibrate?.(35), impact * 1000);
    return () => window.clearTimeout(t);
  }, [reduced, impact]);

  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        className="relative w-full max-w-xl"
        initial={{ opacity: 0, y: reduced ? 0 : 30, rotate: reduced ? 0 : -1 }}
        animate={reduced
          ? { opacity: 1 }
          : { opacity: 1, y: [30, 0, 0, 5, -2, 0], rotate: [-1, -1, -1, -1.6, -0.8, -1] }}
        transition={reduced
          ? { duration: 0.3 }
          : { duration: impact + 0.25, times: [0, 0.4, impact / (impact + 0.25) - 0.01, impact / (impact + 0.25) + 0.04, 0.95, 1], ease: "easeOut" }}
      >
        {/* Passport page */}
        <div
          className="relative overflow-hidden rounded-md p-6 text-left shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85)] sm:p-9"
          style={{
            background: PAPER,
            color: TEXT,
            backgroundImage: `repeating-radial-gradient(circle at 85% 110%, transparent 0 14px, ${INK}0d 14px 15px), repeating-linear-gradient(0deg, transparent 0 31px, ${INK}0a 31px 32px)`,
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b pb-4" style={{ borderColor: `${INK}33` }}>
            <div>
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.36em]" style={{ color: INK }}>RÌNWÁ · Homecoming register</p>
              <p className="mt-1 font-serif text-2xl" style={{ fontFamily: "var(--font-serif)" }}>Ìlé wa · {entry.incoming ? "On the Way Home" : "Came Home"}</p>
            </div>
            {entry.entryNo && (
              <p className="shrink-0 text-right font-mono text-[0.66rem] uppercase tracking-[0.18em]" style={{ color: `${INK}cc` }}>
                Entry<br />№ {entry.entryNo}
              </p>
            )}
          </div>

          <div className="mt-6 flex gap-5 sm:gap-7">
            {entry.photo ? (
              // The frame takes the photo's own shape so nothing is cropped.
              <div className="shrink-0 self-start rounded-[2px] p-1 ring-1" style={{ background: "#e6ddcf", ["--tw-ring-color" as any]: `${INK}40` }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                <img
                  src={entry.photo} alt=""
                  className="block h-auto max-h-40 w-auto max-w-[6.5rem] object-contain grayscale-[35%] sepia-[20%] sm:max-h-48 sm:max-w-[9rem]"
                />
              </div>
            ) : (
              <div className="h-32 w-24 shrink-0 overflow-hidden rounded-[2px] ring-1 sm:h-36 sm:w-28" style={{ background: "#e6ddcf", ["--tw-ring-color" as any]: `${INK}40` }}>
                <RinwaStamp size={96} color={`${INK}`} label={sealLabel} className="m-auto mt-5 opacity-25 sm:mt-7" />
              </div>
            )}
            <dl className="grid min-w-0 flex-1 gap-3.5 text-sm">
              <EntryLine label="Name" value={entry.displayName} />
              <EntryLine label={entry.fromLabel} value={entry.movedFrom} />
              <EntryLine label={entry.whenLabel} value={entry.when} />
              <EntryLine label="Story received" value={today} />
            </dl>
          </div>

          {/* Impact ink ring */}
          {!reduced && (
            <motion.div
              className="pointer-events-none absolute right-[4%] bottom-[2%] h-44 w-44 rounded-full sm:h-52 sm:w-52"
              style={{ border: `3px solid ${INK}` }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: [0, 0.35, 0], scale: [0.9, 1, 1.45] }}
              transition={{ delay: impact - 0.02, duration: 0.65, ease: "easeOut" }}
            />
          )}

          {/* Stamp shadow, closing in as the stamp comes down */}
          {!reduced && (
            <motion.div
              className="pointer-events-none absolute right-[4%] bottom-[2%] h-44 w-44 rounded-full sm:h-52 sm:w-52"
              style={{ background: "radial-gradient(circle, rgba(0,0,0,0.35), transparent 70%)" }}
              initial={{ opacity: 0, scale: 1.7 }}
              animate={{ opacity: [0, 0.6, 0], scale: [1.7, 1, 1] }}
              transition={{ delay: DROP_DELAY - 0.15, duration: DROP_DURATION + 0.25, times: [0, 0.75, 1] }}
            />
          )}

          {/* The stamp */}
          <motion.div
            className="pointer-events-none absolute right-[4%] bottom-[2%] h-44 w-44 sm:h-52 sm:w-52"
            style={{ mixBlendMode: "multiply" }}
            initial={reduced ? { opacity: 0, rotate: -12 } : { opacity: 0, scale: 2.8, rotate: -34, y: -60 }}
            animate={reduced
              ? { opacity: 0.88, rotate: -12 }
              : { opacity: [0, 1, 0.9], scale: [2.8, 0.94, 1], rotate: [-34, -11, -12], y: [-60, 0, 0] }}
            transition={reduced
              ? { delay: 0.3, duration: 0.4 }
              : { delay: DROP_DELAY, duration: DROP_DURATION + 0.18, times: [0, 0.7, 1], ease: [0.55, 0, 0.9, 0.35] }}
          >
            <RinwaStamp size={208} color={INK} worn label={sealLabel} className="h-full w-full" />
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: reduced ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduced ? 0.5 : impact + 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-12 flex flex-col items-center"
      >
        <p className="mb-4 text-[0.6rem] uppercase tracking-[0.45em]" style={{ color: GOLD }}>Stamped &amp; received</p>
        <h3 className="max-w-xl font-serif text-[clamp(2rem,5.5vw,3.2rem)] leading-[1.05] tracking-tight text-white" style={{ fontFamily: "var(--font-serif)" }}>
          Everyone documents the leaving. Nobody documents what happens after you return.
        </h3>
        <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-white/55">
          ILÉ WA by RÌNWÁ is the African diaspora&rsquo;s reference point — trial visits, extended stays and relocations, documented by the people who did it.
          {!entry.shared && " Your story stays private, between you and the RÌNWÁ team."}
        </p>
        <Link
          href="/"
          className="group mt-10 inline-flex items-center gap-3 rounded-md border px-8 py-4 text-xs font-semibold uppercase tracking-[0.28em] transition-colors"
          style={{ borderColor: `${GOLD}59`, background: `${GOLD}1a`, color: GOLD }}
        >
          Back to Home
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </motion.div>
    </div>
  );
}

function EntryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-dashed pb-1.5" style={{ borderColor: `${INK}40` }}>
      <dt className="text-[0.56rem] font-semibold uppercase tracking-[0.3em]" style={{ color: `${INK}b3` }}>{label}</dt>
      <dd className="truncate font-serif text-lg leading-tight" style={{ fontFamily: "var(--font-serif)" }}>{value}</dd>
    </div>
  );
}

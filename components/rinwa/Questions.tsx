"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";
import { ArrowRight, ChevronLeft, ChevronRight, Check } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  fullName: string; email: string; phone: string; company: string;
  eventName: string; eventPurpose: string; objectives: string; eventDate: string;
  hostCity: string; venueLocation: string; eventHashtags: string[];
  eventFormat: string; attendeeCount: string; targetAudience: string;
  responsibilities: string; managingScope: string;
  existingVendors: string; existingVendorDetails: string;
  internalTeam: string; internalTeamDetails: string;
  venueSecured: string; venuePreferences: string;
  requiredSpaces: string[]; productionNeeds: string[]; specialProduction: string;
  registrationMethod: string; ticketingSupport: string;
  vipGuests: string; vipDetails: string;
  accessibilityRequired: string; accessibilityDetails: string;
  guestTouchpoints: string; speakerCount: string;
  travelCoordination: string; speakerManagement: string;
  staffingRequired: string; volunteersNeeded: string; staffingRecruitment: string;
  cateringProvided: string; serviceStyle: string[]; dietaryRequirements: string;
  attendeeCommunications: string; marketingManagement: string; eventMaterials: string[];
  transportationRequired: string; hotelBlocks: string; airportTransfers: string;
  sponsorsInvolved: string; sponsorDeliverables: string; exhibitorActivations: string;
  eventInsurance: string; permitsRequired: string; securityRequired: string; contingencyPlans: string;
  budgetRange: string; budgetConstraints: string; decisionMakers: string; procurementProcess: string;
  planningStart: string; majorMilestones: string; postEventReporting: string; successDefinition: string;
}

const BLANK: FormData = {
  fullName: "", email: "", phone: "", company: "",
  eventName: "", eventPurpose: "", objectives: "", eventDate: "",
  hostCity: "", venueLocation: "", eventHashtags: [],
  eventFormat: "", attendeeCount: "", targetAudience: "",
  responsibilities: "", managingScope: "",
  existingVendors: "", existingVendorDetails: "",
  internalTeam: "", internalTeamDetails: "",
  venueSecured: "", venuePreferences: "",
  requiredSpaces: [], productionNeeds: [], specialProduction: "",
  registrationMethod: "", ticketingSupport: "",
  vipGuests: "", vipDetails: "",
  accessibilityRequired: "", accessibilityDetails: "",
  guestTouchpoints: "", speakerCount: "",
  travelCoordination: "", speakerManagement: "",
  staffingRequired: "", volunteersNeeded: "", staffingRecruitment: "",
  cateringProvided: "", serviceStyle: [], dietaryRequirements: "",
  attendeeCommunications: "", marketingManagement: "", eventMaterials: [],
  transportationRequired: "", hotelBlocks: "", airportTransfers: "",
  sponsorsInvolved: "", sponsorDeliverables: "", exhibitorActivations: "",
  eventInsurance: "", permitsRequired: "", securityRequired: "", contingencyPlans: "",
  budgetRange: "", budgetConstraints: "", decisionMakers: "", procurementProcess: "",
  planningStart: "", majorMilestones: "", postEventReporting: "", successDefinition: "",
};

const SECTIONS = [
  { tag: "01 — Your Details",          title: "Let's start with the basics.",        desc: "Tell us who you are and how to reach you." },
  { tag: "02 — Event Overview",         title: "Tell us about your event.",           desc: "Help us understand the shape and scale of what you're creating." },
  { tag: "03 — Scope of Support",       title: "How can we best serve you?",         desc: "Define the boundaries of engagement and your existing setup." },
  { tag: "04 — Venue & Production",     title: "Setting the stage.",                 desc: "Venue preferences, required spaces, and production requirements." },
  { tag: "05 — Guest Experience",       title: "Crafting every touchpoint.",         desc: "From registration to departure — every moment matters." },
  { tag: "06 — Operations",             title: "The logistics of excellence.",        desc: "Staffing, catering, marketing — the moving parts behind the curtain." },
  { tag: "07 — Logistics & Risk",       title: "Covering every angle.",              desc: "Transportation, sponsorship, compliance, and contingency." },
  { tag: "08 — Budget & Timeline",      title: "Making it all possible.",            desc: "Investment parameters, decision-making, and the road to event day." },
];

const TOTAL = SECTIONS.length;

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function Questions() {
  const reduced = useReducedMotion();
  const [step, setStep]           = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData]           = useState<FormData>(BLANK);

  function set(field: keyof FormData, value: string) {
    setData(prev => ({ ...prev, [field]: value }));
  }

  function toggle(field: keyof FormData, value: string) {
    setData(prev => {
      const arr = prev[field] as string[];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  }

  function setArr(field: keyof FormData, value: string[]) {
    setData(prev => ({ ...prev, [field]: value }));
  }

  function next() {
    if (step === 1 && (!data.fullName || !data.email || !data.phone || !data.company)) {
      toast.error("Please complete all required fields before continuing.");
      return;
    }
    setStep(s => s + 1);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function back() {
    setStep(s => s - 1);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  async function submit() {
    try {
      setSubmitting(true);
      const res = await fetch("/api/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Submission failed");
      }
      setStep(9);
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const variants = {
    enter:  { opacity: 0, y: reduced ? 0 : 30 },
    center: { opacity: 1, y: 0 },
    exit:   { opacity: 0, y: reduced ? 0 : -18 },
  };
  const transition = { duration: 0.45, ease: [0.16, 1, 0.3, 1] as any };

  return (
    <div className="relative">
      <Toaster position="top-center" toastOptions={{ style: { background: "#07171a", color: "#f5f0e8", border: "1px solid rgba(125,211,207,0.2)" } }} />

      {/* Fixed background image */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/images/questionnaire-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center top",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="absolute inset-0 bg-[#041114]/83" />
      </div>

      {/* Progress bar */}
      {step >= 1 && step <= TOTAL && (
        <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-white/8">
          <motion.div
            className="h-full bg-[#7dd3cf]"
            initial={false}
            animate={{ width: `${((step - 1) / (TOTAL - 1)) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="welcome" variants={variants} initial="enter" animate="center" exit="exit" transition={transition}>
              <WelcomeScreen onBegin={() => setStep(1)} />
            </motion.div>
          )}

          {step >= 1 && step <= TOTAL && (
            <motion.div key={`s${step}`} variants={variants} initial="enter" animate="center" exit="exit" transition={transition}>
              <Shell
                tag={SECTIONS[step - 1].tag}
                title={SECTIONS[step - 1].title}
                desc={SECTIONS[step - 1].desc}
                step={step}
                total={TOTAL}
                onBack={back}
                onNext={step < TOTAL ? next : submit}
                submitting={submitting}
                isLast={step === TOTAL}
              >
                {step === 1 && <S1 data={data} set={set} />}
                {step === 2 && <S2 data={data} set={set} toggle={toggle} setArr={setArr} />}
                {step === 3 && <S3 data={data} set={set} />}
                {step === 4 && <S4 data={data} set={set} toggle={toggle} />}
                {step === 5 && <S5 data={data} set={set} />}
                {step === 6 && <S6 data={data} set={set} toggle={toggle} />}
                {step === 7 && <S7 data={data} set={set} />}
                {step === 8 && <S8 data={data} set={set} />}
              </Shell>
            </motion.div>
          )}

          {step === 9 && (
            <motion.div key="done" variants={variants} initial="enter" animate="center" exit="exit" transition={transition}>
              <SuccessScreen />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Screens ───────────────────────────────────────────────────────────────────

function WelcomeScreen({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center"
      >
        <Image src="/images/logo.png" alt="RÌNWÁ" width={56} height={56} className="mx-auto mb-5 opacity-90" />
        <p className="text-[0.6rem] uppercase tracking-[0.5em] text-[#7dd3cf]/65 mb-12">
          The Global Standard for African Hospitality
        </p>

        <h1
          className="font-serif text-[clamp(3.2rem,9vw,6.5rem)] leading-[0.88] tracking-tight text-white mb-8"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Welcome Home
        </h1>

        <div className="max-w-lg space-y-4 text-[0.95rem] sm:text-base text-white/55 leading-relaxed mb-14">
          <p>Thank you for reaching out.</p>
          <p>
            We're excited to learn more about your vision and bring clarity to your thoughts.
            To ensure the most accurate recommendations and a tailored quote, please take a few
            moments to answer the questions below.
          </p>
          <p>
            Your responses will help us understand your goals, preferences, and the level
            of support required, allowing us to design the experience that aligns with your needs.
          </p>
          <p className="text-white/35 text-sm italic">We look forward to bringing your vision to life.</p>
        </div>

        <button
          onClick={onBegin}
          className="group inline-flex items-center gap-3 rounded-full border border-[#7dd3cf]/35 bg-[#7dd3cf]/10 px-8 py-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#7dd3cf] transition-all hover:border-[#7dd3cf]/60 hover:bg-[#7dd3cf]/18"
        >
          Tell Us More
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
        </button>
      </motion.div>
    </div>
  );
}

function SuccessScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center"
      >
        <div className="w-16 h-16 rounded-full border border-[#7dd3cf]/40 bg-[#7dd3cf]/10 flex items-center justify-center mb-8">
          <Check size={26} className="text-[#7dd3cf]" strokeWidth={2.5} />
        </div>

        <Image src="/images/logo.png" alt="RÌNWÁ" width={46} height={46} className="mx-auto mb-4 opacity-85" />
        <p className="text-[0.6rem] tracking-[0.45em] text-[#7dd3cf]/60 mb-12">
          You&apos;ve&nbsp;Rinwa&apos;d
        </p>

        <h2
          className="font-serif text-[clamp(2.4rem,7vw,4.5rem)] leading-[0.95] tracking-tight text-white mb-6 max-w-2xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          We look forward to bringing your vision to life.
        </h2>
        <p className="text-base sm:text-lg text-white/55 leading-relaxed max-w-md mb-3">
          Your responses have been received. Our team will review everything carefully and reach out
          within <span className="text-white/80">48 hours</span> with tailored recommendations.
        </p>
        <p className="text-sm text-white/35 italic mb-16">Check your inbox — a confirmation is on its way.</p>

        <div className="flex flex-col items-center gap-4">
          <p className="text-[0.58rem] uppercase tracking-[0.55em] text-[#7dd3cf]/50">Enter Into Your Ease</p>
          <div className="flex items-center gap-4">
            <div className="h-px w-14 bg-[#7dd3cf]/25" />
            <Image src="/images/logo.png" alt="" width={20} height={20} className="opacity-30" />
            <div className="h-px w-14 bg-[#7dd3cf]/25" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Section Shell ──────────────────────────────────────────────────────────────

function Shell({
  tag, title, desc, step, total, onBack, onNext, submitting, isLast, children,
}: {
  tag: string; title: string; desc: string;
  step: number; total: number;
  onBack: () => void; onNext: () => void;
  submitting: boolean; isLast: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-20 sm:py-24">
      <div className="w-full max-w-2xl">
        {/* Header meta */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-[0.6rem] uppercase tracking-[0.38em] text-[#7dd3cf]/60">{tag}</p>
          <p className="text-[0.6rem] uppercase tracking-[0.3em] text-white/30">Step {step} of {total}</p>
        </div>

        {/* Section title */}
        <div className="mb-8">
          <h2
            className="font-serif text-[clamp(2rem,5.5vw,3.25rem)] leading-[1.05] tracking-tight text-white"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {title}
          </h2>
          <p className="mt-3 text-[0.9rem] text-white/50 leading-relaxed">{desc}</p>
        </div>

        {/* Card */}
        <div className="rounded-[2rem] border border-white/10 bg-[#041114]/72 backdrop-blur-xl p-6 sm:p-8 shadow-[0_28px_80px_rgba(0,0,0,0.5)]">
          {children}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/60 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <button
            onClick={onNext}
            disabled={submitting}
            className="group flex items-center gap-2 rounded-full bg-[#7dd3cf] px-7 py-3.5 text-sm font-semibold text-[#041114] transition hover:bg-[#a5e3df] disabled:opacity-55 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting…" : isLast ? "Submit Responses" : "Continue"}
            {!submitting && (
              isLast
                ? <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                : <ChevronRight size={14} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Input Primitives ──────────────────────────────────────────────────────────

const inputCls =
  "w-full min-h-[52px] rounded-2xl border border-white/10 bg-[#07171a]/90 px-4 py-3.5 text-white text-sm placeholder:text-white/22 outline-none transition focus:border-[#7dd3cf]/50 focus:shadow-[0_0_0_4px_rgba(125,211,207,0.07)]";

function Label({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return (
    <span className="block text-[0.68rem] uppercase tracking-[0.26em] text-white/42 mb-3">
      {children}{req && <span className="ml-1 text-[#7dd3cf]/60">*</span>}
    </span>
  );
}

function Field({
  label, name, type = "text", placeholder, value, onChange, req,
}: {
  label: string; name: string; type?: string;
  placeholder?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  req?: boolean;
}) {
  return (
    <label className="block">
      <Label req={req}>{label}</Label>
      <input
        type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder || label}
        className={inputCls}
      />
    </label>
  );
}

function Area({
  label, name, placeholder, value, onChange, rows = 4,
}: {
  label: string; name: string; placeholder?: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <textarea
        name={name} value={value} onChange={onChange} rows={rows}
        placeholder={placeholder || label}
        className={`${inputCls} min-h-0 resize-none`}
      />
    </label>
  );
}

function YesNo({
  label, value, onToggle,
}: {
  label: string; value: string; onToggle: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-3">
        {(["Yes", "No"] as const).map(opt => (
          <button
            key={opt} type="button"
            onClick={() => onToggle(value === opt ? "" : opt)}
            className={`flex-1 py-3 rounded-2xl border text-sm font-medium transition-all ${
              value === opt
                ? "border-[#7dd3cf] bg-[#7dd3cf]/14 text-[#7dd3cf]"
                : "border-white/10 bg-white/4 text-white/50 hover:border-white/18 hover:text-white"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function Chips({
  label, options, values, onToggle, multi,
}: {
  label: string; options: string[];
  values: string | string[];
  onToggle: (v: string) => void;
  multi?: boolean;
}) {
  const active = (o: string) => Array.isArray(values) ? values.includes(o) : values === o;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Label>{label}</Label>
        {multi && <span className="text-[0.58rem] uppercase tracking-[0.22em] text-white/28 -mt-3">Select all that apply</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button
            key={o} type="button" onClick={() => onToggle(o)}
            className={`rounded-full border px-4 py-2 text-sm transition-all ${
              active(o)
                ? "border-[#7dd3cf] bg-[#7dd3cf]/14 text-[#7dd3cf]"
                : "border-white/10 bg-white/4 text-white/50 hover:border-white/18 hover:bg-white/7 hover:text-white"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-white/8" />;
}

function SubCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 space-y-5">
      <p className="text-[0.6rem] uppercase tracking-[0.28em] text-white/35">{title}</p>
      {children}
    </div>
  );
}

function Reveal({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="pt-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Hashtag Input ─────────────────────────────────────────────────────────────

function HashtagInput({
  values,
  onChange,
}: {
  values: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function addTag() {
    const raw = input.trim().replace(/^#+/, "").replace(/\s+/g, "");
    if (!raw) return;
    const tag = `#${raw}`;
    if (!values.includes(tag)) onChange([...values, tag]);
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(values.filter(t => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && !input && values.length > 0) onChange(values.slice(0, -1));
  }

  return (
    <div>
      <Label>Official Event Hashtag(s)</Label>
      <p className="text-[0.63rem] text-white/25 -mt-1.5 mb-3 leading-relaxed">
        Press <span className="text-white/40">Enter</span> or{" "}
        <span className="text-white/40">comma</span> to add each tag. Backspace removes the last one.
      </p>
      <AnimatePresence>
        {values.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-wrap gap-2 mb-3 overflow-hidden"
          >
            {values.map(tag => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.18 }}
                className="inline-flex items-center gap-1 rounded-full border border-[#7dd3cf]/35 bg-[#7dd3cf]/10 pl-3 pr-2 py-1.5"
              >
                <span className="font-mono text-[#7dd3cf]/50 text-xs select-none">#</span>
                <span className="text-sm text-[#7dd3cf] font-medium">{tag.slice(1)}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove ${tag}`}
                  className="ml-1 w-4 h-4 flex items-center justify-center rounded-full hover:bg-[#7dd3cf]/25 transition-colors text-[#7dd3cf]/45 hover:text-[#7dd3cf] text-sm leading-none"
                >
                  ×
                </button>
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7dd3cf]/40 font-mono text-sm pointer-events-none select-none">#</span>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value.replace(/^#+/, ""))}
            onKeyDown={handleKeyDown}
            placeholder="YourHashtag"
            className={`${inputCls} pl-8`}
          />
        </div>
        <button
          type="button"
          onClick={addTag}
          className="flex-shrink-0 px-5 rounded-2xl border border-[#7dd3cf]/25 bg-[#7dd3cf]/8 text-[#7dd3cf] text-sm font-medium hover:bg-[#7dd3cf]/18 hover:border-[#7dd3cf]/45 transition-all"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─── Sections ──────────────────────────────────────────────────────────────────

function S1({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  const f = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value);
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Full Name" name="fullName" value={data.fullName} onChange={f("fullName")} req placeholder="Your full name" />
      <Field label="Email Address" name="email" type="email" value={data.email} onChange={f("email")} req placeholder="your@email.com" />
      <Field label="Phone Number" name="phone" type="tel" value={data.phone} onChange={f("phone")} req placeholder="+234 xxx xxx xxxx" />
      <Field label="Organization / Brand" name="company" value={data.company} onChange={f("company")} req placeholder="Your company or brand" />
    </div>
  );
}

function S2({
  data, set, toggle, setArr,
}: {
  data: FormData;
  set: (f: keyof FormData, v: string) => void;
  toggle: (f: keyof FormData, v: string) => void;
  setArr: (f: keyof FormData, v: string[]) => void;
}) {
  const f = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value);
  const a = (k: keyof FormData) => (e: React.ChangeEvent<HTMLTextAreaElement>) => set(k, e.target.value);
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Event Name" name="eventName" value={data.eventName} onChange={f("eventName")} placeholder="What is this event called?" />
        <Field label="Host City" name="hostCity" value={data.hostCity} onChange={f("hostCity")} placeholder="e.g. Lagos, Toronto, Vancouver" />
      </div>
      <Area label="Event Purpose" name="eventPurpose" value={data.eventPurpose} onChange={a("eventPurpose")} rows={2} placeholder="What is the purpose or theme of this event?" />
      <Area label="Primary objectives and success metrics" name="objectives" value={data.objectives} onChange={a("objectives")} placeholder="What does a successful event look like to you?" />
      <Area label="Who is the target audience?" name="targetAudience" value={data.targetAudience} onChange={a("targetAudience")} rows={3} placeholder="Who is this event designed for?" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Event date(s)" name="eventDate" value={data.eventDate} onChange={f("eventDate")} placeholder="Confirmed or proposed dates" />
        <Field label="Venue Location" name="venueLocation" value={data.venueLocation} onChange={f("venueLocation")} placeholder="Specific venue being considered" />
        <Field label="Expected attendee count" name="attendeeCount" value={data.attendeeCount} onChange={f("attendeeCount")} placeholder="Approximate number" />
      </div>
      <HashtagInput values={data.eventHashtags} onChange={tags => setArr("eventHashtags", tags)} />
      <Chips
        label="Event format"
        options={["In-Person", "Virtual", "Hybrid"]}
        values={data.eventFormat}
        onToggle={v => set("eventFormat", data.eventFormat === v ? "" : v)}
      />
    </div>
  );
}

function S3({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  const a = (k: keyof FormData) => (e: React.ChangeEvent<HTMLTextAreaElement>) => set(k, e.target.value);
  return (
    <div className="space-y-6">
      <Area label="What specific responsibilities would you like us to oversee?" name="responsibilities" value={data.responsibilities} onChange={a("responsibilities")} placeholder="List the areas you'd like RÌNWÁ to manage…" />
      <Divider />
      <Chips
        label="Will we be managing the entire event or specific workstreams?"
        options={["Entire Event Operation", "Specific Workstreams Only"]}
        values={data.managingScope}
        onToggle={v => set("managingScope", data.managingScope === v ? "" : v)}
      />
      <Divider />
      <YesNo label="Are there existing vendors already contracted?" value={data.existingVendors} onToggle={v => set("existingVendors", v)} />
      <Reveal show={data.existingVendors === "Yes"}>
        <Area label="Tell us about the existing vendors" name="existingVendorDetails" value={data.existingVendorDetails} onChange={a("existingVendorDetails")} rows={3} placeholder="Who are they and what do they cover?" />
      </Reveal>
      <Divider />
      <YesNo label="Is there an internal team we'll be collaborating with?" value={data.internalTeam} onToggle={v => set("internalTeam", v)} />
      <Reveal show={data.internalTeam === "Yes"}>
        <Area label="Tell us about your internal team" name="internalTeamDetails" value={data.internalTeamDetails} onChange={a("internalTeamDetails")} rows={3} placeholder="Structure, size, and key stakeholders" />
      </Reveal>
    </div>
  );
}

const SPACES = ["Main Stage", "Breakout Rooms", "VIP Area", "Registration Desk", "Green Room", "Exhibition Hall", "Networking Space", "Press Area", "Prayer / Quiet Room"];
const PRODUCTION = ["AV & Sound", "Staging", "Lighting", "Livestreaming", "Recording", "LED / Screens", "Special Effects"];

function S4({
  data, set, toggle,
}: {
  data: FormData;
  set: (f: keyof FormData, v: string) => void;
  toggle: (f: keyof FormData, v: string) => void;
}) {
  const a = (k: keyof FormData) => (e: React.ChangeEvent<HTMLTextAreaElement>) => set(k, e.target.value);
  return (
    <div className="space-y-6">
      <YesNo label="Has a venue been secured?" value={data.venueSecured} onToggle={v => set("venueSecured", v)} />
      <Area label="What are your top 3 venue preferences?" name="venuePreferences" value={data.venuePreferences} onChange={a("venuePreferences")} rows={3} placeholder="List your preferred venues or venue types…" />
      <Divider />
      <Chips label="What spaces are required?" options={SPACES} values={data.requiredSpaces} onToggle={v => toggle("requiredSpaces", v)} multi />
      <Divider />
      <Chips label="What production requirements are needed?" options={PRODUCTION} values={data.productionNeeds} onToggle={v => toggle("productionNeeds", v)} multi />
      <Area label="Any special production elements planned?" name="specialProduction" value={data.specialProduction} onChange={a("specialProduction")} rows={3} placeholder="Custom installations, immersive experiences, branded moments…" />
    </div>
  );
}

function S5({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  const f = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value);
  const a = (k: keyof FormData) => (e: React.ChangeEvent<HTMLTextAreaElement>) => set(k, e.target.value);
  return (
    <div className="space-y-6">
      <Field label="How will guests register?" name="registrationMethod" value={data.registrationMethod} onChange={f("registrationMethod")} placeholder="Online platform, physical desk, invitation only…" />
      <YesNo label="Do you require ticketing or attendee management support?" value={data.ticketingSupport} onToggle={v => set("ticketingSupport", v)} />
      <Divider />
      <YesNo label="Will there be VIPs, speakers, sponsors, or special guests?" value={data.vipGuests} onToggle={v => set("vipGuests", v)} />
      <Reveal show={data.vipGuests === "Yes"}>
        <Area label="Details about VIPs and special guests" name="vipDetails" value={data.vipDetails} onChange={a("vipDetails")} rows={3} placeholder="Who are they and what do they need?" />
      </Reveal>
      <YesNo label="Are accessibility accommodations required?" value={data.accessibilityRequired} onToggle={v => set("accessibilityRequired", v)} />
      <Reveal show={data.accessibilityRequired === "Yes"}>
        <Area label="What accessibility accommodations are needed?" name="accessibilityDetails" value={data.accessibilityDetails} onChange={a("accessibilityDetails")} rows={3} placeholder="Wheelchair access, sign language, dietary restrictions…" />
      </Reveal>
      <Divider />
      <Area label="Describe the guest experience from registration through departure" name="guestTouchpoints" value={data.guestTouchpoints} onChange={a("guestTouchpoints")} rows={4} placeholder="Key touchpoints, moments of delight, the overall journey…" />
      <Divider />
      <Field label="How many speakers or performers will be involved?" name="speakerCount" value={data.speakerCount} onChange={f("speakerCount")} placeholder="Approximate number or range" />
      <YesNo label="Will travel, accommodations, or hospitality need to be coordinated?" value={data.travelCoordination} onToggle={v => set("travelCoordination", v)} />
      <YesNo label="Will speaker management and communications be part of our scope?" value={data.speakerManagement} onToggle={v => set("speakerManagement", v)} />
    </div>
  );
}

const SERVICE_STYLES = ["Buffet", "Plated", "Cocktail Reception", "Stations", "Food Trucks", "Canapés Only"];
const MATERIALS = ["Signage & Wayfinding", "Event Programs", "Name Badges", "Gift Bags", "Branded Merchandise", "Press Kits", "Menus"];

function S6({
  data, set, toggle,
}: {
  data: FormData;
  set: (f: keyof FormData, v: string) => void;
  toggle: (f: keyof FormData, v: string) => void;
}) {
  const f = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value);
  const a = (k: keyof FormData) => (e: React.ChangeEvent<HTMLTextAreaElement>) => set(k, e.target.value);
  return (
    <div className="space-y-6">
      <Area label="What event-day staffing is needed?" name="staffingRequired" value={data.staffingRequired} onChange={a("staffingRequired")} rows={3} placeholder="Roles, estimated numbers, responsibilities…" />
      <YesNo label="Will volunteers be used?" value={data.volunteersNeeded} onToggle={v => set("volunteersNeeded", v)} />
      <Field label="Who is responsible for recruiting, training, and scheduling staff?" name="staffingRecruitment" value={data.staffingRecruitment} onChange={f("staffingRecruitment")} placeholder="Us, your team, or shared responsibility?" />
      <Divider />
      <YesNo label="Will food and beverage be provided?" value={data.cateringProvided} onToggle={v => set("cateringProvided", v)} />
      <Reveal show={data.cateringProvided === "Yes"}>
        <div className="space-y-5">
          <Chips label="Service style" options={SERVICE_STYLES} values={data.serviceStyle} onToggle={v => toggle("serviceStyle", v)} multi />
          <Field label="Are there dietary requirements to accommodate?" name="dietaryRequirements" value={data.dietaryRequirements} onChange={f("dietaryRequirements")} placeholder="Halal, vegan, allergies, etc." />
        </div>
      </Reveal>
      <Divider />
      <YesNo label="Will we be responsible for attendee communications?" value={data.attendeeCommunications} onToggle={v => set("attendeeCommunications", v)} />
      <Field label="Who is managing marketing and promotions?" name="marketingManagement" value={data.marketingManagement} onChange={f("marketingManagement")} placeholder="In-house team, agency, or RÌNWÁ?" />
      <Chips label="What event materials are required?" options={MATERIALS} values={data.eventMaterials} onToggle={v => toggle("eventMaterials", v)} multi />
    </div>
  );
}

function S7({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  const a = (k: keyof FormData) => (e: React.ChangeEvent<HTMLTextAreaElement>) => set(k, e.target.value);
  return (
    <div className="space-y-5">
      <SubCard title="Transportation & Accommodation">
        <YesNo label="Will transportation be required for guests, speakers, or staff?" value={data.transportationRequired} onToggle={v => set("transportationRequired", v)} />
        <YesNo label="Are hotel room blocks needed?" value={data.hotelBlocks} onToggle={v => set("hotelBlocks", v)} />
        <YesNo label="Will airport transfers or shuttle services be required?" value={data.airportTransfers} onToggle={v => set("airportTransfers", v)} />
      </SubCard>

      <SubCard title="Sponsorship & Partnerships">
        <YesNo label="Are sponsors involved in this event?" value={data.sponsorsInvolved} onToggle={v => set("sponsorsInvolved", v)} />
        <Reveal show={data.sponsorsInvolved === "Yes"}>
          <Area label="What sponsor deliverables need operational support?" name="sponsorDeliverables" value={data.sponsorDeliverables} onChange={a("sponsorDeliverables")} rows={3} placeholder="Activations, branding, speaking slots…" />
        </Reveal>
        <YesNo label="Are there exhibitor or vendor activations?" value={data.exhibitorActivations} onToggle={v => set("exhibitorActivations", v)} />
      </SubCard>

      <SubCard title="Risk, Compliance & Security">
        <YesNo label="Is event insurance required?" value={data.eventInsurance} onToggle={v => set("eventInsurance", v)} />
        <YesNo label="Are permits or government approvals needed?" value={data.permitsRequired} onToggle={v => set("permitsRequired", v)} />
        <YesNo label="Will security personnel be required?" value={data.securityRequired} onToggle={v => set("securityRequired", v)} />
        <Area label="What contingency plans are currently in place?" name="contingencyPlans" value={data.contingencyPlans} onChange={a("contingencyPlans")} rows={3} placeholder="Backup plans, emergency protocols, risk mitigation…" />
      </SubCard>
    </div>
  );
}

function S8({ data, set }: { data: FormData; set: (f: keyof FormData, v: string) => void }) {
  const f = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value);
  const a = (k: keyof FormData) => (e: React.ChangeEvent<HTMLTextAreaElement>) => set(k, e.target.value);
  return (
    <div className="space-y-6">
      <Field label="What is the approved budget range?" name="budgetRange" value={data.budgetRange} onChange={f("budgetRange")} placeholder="e.g. ₦5M – ₦10M or a specific figure" />
      <Area label="Are there budget constraints or spending priorities?" name="budgetConstraints" value={data.budgetConstraints} onChange={a("budgetConstraints")} rows={3} placeholder="What should we prioritize within the budget?" />
      <Divider />
      <Field label="Who are the final decision-makers?" name="decisionMakers" value={data.decisionMakers} onChange={f("decisionMakers")} placeholder="Names, roles, and authority levels" />
      <Field label="What is the procurement and approval process?" name="procurementProcess" value={data.procurementProcess} onChange={f("procurementProcess")} placeholder="How are vendors selected and contracts signed?" />
      <Divider />
      <Field label="When do you expect planning to begin?" name="planningStart" value={data.planningStart} onChange={f("planningStart")} placeholder="Expected kick-off date or week" />
      <Area label="What are the major milestones between now and event day?" name="majorMilestones" value={data.majorMilestones} onChange={a("majorMilestones")} rows={4} placeholder="Key dates, decision points, deliverable deadlines…" />
      <YesNo label="Do you require post-event reporting and reconciliation?" value={data.postEventReporting} onToggle={v => set("postEventReporting", v)} />
      <Area label="What deliverables would define a successful engagement?" name="successDefinition" value={data.successDefinition} onChange={a("successDefinition")} rows={3} placeholder="How would you know this partnership was a success?" />
    </div>
  );
}

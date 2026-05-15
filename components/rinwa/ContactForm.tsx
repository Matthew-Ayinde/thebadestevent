"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { contactGoals, contactIndustries } from "./data";
import toast from "react-hot-toast";

/**
 * Refined inquiry form.
 * The fields are grouped into two intentional steps so the experience feels human and calm.
 */
export function ContactForm() {
  const shouldReduceMotion = useReducedMotion();
  const [step, setStep] = useState<1 | 2>(1);
  const [industry, setIndustry] = useState(contactIndustries[0]);
  const [goals, setGoals] = useState<string[]>([contactGoals[0]]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    projectDate: "",
    estimatedBudget: "",
    description: "",
  });

  const stepLabel = useMemo(() => (step === 1 ? "Tell us who you are" : "Share the shape of the project"), [step]);

  const toggleGoal = (goal: string) => {
    setGoals((current) => (current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.fullName || !formData.email || !formData.phone || !formData.company || !formData.projectDate || !formData.estimatedBudget || !formData.description) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          projectDate: formData.projectDate,
          estimatedBudget: parseInt(formData.estimatedBudget),
          description: formData.description,
          industry: industry,
          goals: goals,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit");
      }

      toast.success("Thank you! We'll be in touch within 48 hours.");
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        company: "",
        projectDate: "",
        estimatedBudget: "",
        description: "",
      });
      setStep(1);
      setIndustry(contactIndustries[0]);
      setGoals([contactGoals[0]]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12">
        <div className="max-w-xl">
          <p className="text-[0.72rem] uppercase tracking-[0.38em] text-teal-200/75">Contact / inquiry</p>
          <h2 className="mt-4 font-serif text-[clamp(3rem,7vw,5.2rem)] leading-[0.94] tracking-[-0.05em] text-white">
            Have a vision? We’re listening.
          </h2>
          <p className="mt-5 text-lg leading-8 text-white/68">
            We partner with brands and institutions to design culture-driven experiences.
          </p>

          <div className="mt-10 rounded-4xl border border-white/10 bg-white/4 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-teal-100/70">Project pulse</p>
            <div className="mt-4 space-y-2 text-sm text-white/72">
              <p>Step: {stepLabel}</p>
              <p>Industry: {industry}</p>
              <p>Goals: {goals.join(" • ")}</p>
            </div>
          </div>
        </div>

        <motion.form
          initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.85, ease: "easeOut" }}
          onSubmit={handleSubmit}
          className="rounded-[2.25rem] border border-white/10 bg-white/4 p-5 shadow-[0_20px_90px_rgba(0,0,0,0.22)] sm:p-6"
        >
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-teal-100/70">Inquiry flow</p>
              <p className="mt-2 font-serif text-2xl text-white">{step === 1 ? "Step 1 of 2" : "Step 2 of 2"}</p>
            </div>
            <div className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.28em] text-white/45">
              <span className={`h-2.5 w-2.5 rounded-full ${step === 1 ? "bg-teal-300" : "bg-white/20"}`} />
              <span className={`h-2.5 w-2.5 rounded-full ${step === 2 ? "bg-teal-300" : "bg-white/20"}`} />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step-1"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -16 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="pt-6"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FloatingField
                    label="Full Name"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                  />
                  <FloatingField
                    label="Email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                  <FloatingField
                    label="Phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                  <FloatingField
                    label="Company / Brand"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                  />
                  <FloatingField
                    label="Project Timeline"
                    name="projectDate"
                    value={formData.projectDate}
                    onChange={handleInputChange}
                  />
                  <FloatingField
                    label="Budget (₦)"
                    name="estimatedBudget"
                    value={formData.estimatedBudget}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="mt-6">
                  <p className="text-sm text-white/70">Industry</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {contactIndustries.map((option) => (
                      <ChipButton key={option} active={industry === option} onClick={() => setIndustry(option)}>
                        {option}
                      </ChipButton>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-full bg-teal-300 px-5 py-3 text-sm font-semibold text-slate-950 transition duration-300 hover:bg-teal-200"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step-2"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -16 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="pt-6"
              >
                <label className="block">
                  <span className="mb-2 block text-sm text-white/70">Description</span>
                  <textarea
                    rows={6}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Tell us about the atmosphere, audience, and outcome you want to create."
                    className="w-full rounded-2xl border border-white/10 bg-[#041114]/60 px-4 py-3 text-white placeholder:text-white/28 outline-none transition focus:border-teal-300/50 focus:bg-[#07171a] focus:shadow-[0_0_0_4px_rgba(125,211,207,0.08)]"
                  />
                </label>

                <div className="mt-6">
                  <p className="text-sm text-white/70">Success metrics</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {contactGoals.map((goal) => (
                      <ChipButton key={goal} active={goals.includes(goal)} onClick={() => toggleGoal(goal)}>
                        {goal}
                      </ChipButton>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm text-white/78 transition duration-300 hover:border-teal-300/40 hover:bg-white/10"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-full bg-teal-300 px-6 py-4 text-base font-semibold text-slate-950 transition duration-300 hover:bg-teal-200 hover:shadow-[0_0_35px_rgba(125,211,207,0.18)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Submitting..." : "I’m Here, I’ve Arrived"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>
      </div>
    </section>
  );
}

function FloatingField({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const type = label.toLowerCase().includes("email") ? "email" : label.toLowerCase().includes("budget") ? "number" : "text";

  return (
    <label className="relative block">
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder=" "
        className="peer w-full rounded-2xl border border-white/10 bg-[#041114]/60 px-4 pb-3 pt-6 text-white placeholder:text-transparent outline-none transition focus:border-teal-300/50 focus:bg-[#07171a] focus:shadow-[0_0_0_4px_rgba(125,211,207,0.08)]"
      />
      <span className="pointer-events-none absolute left-4 top-4 origin-left text-sm text-white/48 transition-all duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-focus:top-4 peer-focus:translate-y-0 peer-focus:text-sm peer-focus:text-teal-100">
        {label}
      </span>
    </label>
  );
}

function ChipButton({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition-all duration-300 ${
        active
          ? "border-teal-300 bg-teal-300/15 text-teal-100"
          : "border-white/10 bg-white/5 text-white/70 hover:border-teal-300/40 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

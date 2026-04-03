/**
 * Minimal pause between scenes.
 * The typography and spacing are intentionally large to create a breath in the experience.
 */
export function PartnershipDivider() {
  return (
    <section className="px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2.5rem] border border-white/10 bg-white/3 px-6 py-16 text-center sm:px-10 lg:py-20">
          <p className="text-[0.72rem] uppercase tracking-[0.38em] text-teal-100/70">Partnerships &amp; Collaborations</p>
          <h2 className="mt-6 font-serif text-[clamp(2.6rem,8vw,6.6rem)] leading-[0.9] tracking-[-0.06em] text-white">
            PARTNERSHIPS &amp; COLLABORATIONS
          </h2>
          <p className="mt-6 text-lg text-white/72">rinwahospitality@gmail.com</p>
        </div>
      </div>
    </section>
  );
}

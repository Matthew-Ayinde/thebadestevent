import { serif } from './CareersChrome';

const PLACEMENTS = [
  {
    title: 'In the kitchen',
    roles: 'Executive and sous chefs, private chefs, pastry leads, kitchen managers.',
    line: 'For cooks with a point of view and the discipline to deliver it every service.',
  },
  {
    title: 'Behind the bar',
    roles: 'Head bartenders, mixologists, bar managers, beverage consultants.',
    line: 'For people who know a great drink is half technique, half theatre.',
  },
  {
    title: 'On the floor',
    roles: 'Front-of-house leads, guest experience managers, sommeliers, concierges.',
    line: 'For people who read a room before anyone says a word.',
  },
  {
    title: 'Behind the scenes',
    roles: 'Experiential producers, event managers, creative directors, activation leads.',
    line: 'For the people who turn a brief into a night people talk about for years.',
  },
  {
    title: 'Running the house',
    roles: 'Hotel operations, F&B managers, revenue and people leads.',
    line: 'For the ones who keep everything working so the magic can happen.',
  },
];

const STEPS = [
  { title: 'Apply once', body: 'Tell us what you do best and where you want to go next.' },
  { title: 'We actually read it', body: 'A RÌNWÁ advisor reviews every application with care.' },
  { title: 'We make the introduction', body: 'If there’s a fit, we connect you directly with the hiring team and prepare you for it.' },
  { title: 'We stay in your corner', body: 'Even if this role isn’t the one, you stay in our circle for the next.' },
];

const pad = (n: number) => String(n + 1).padStart(2, '0');

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-[0.66rem] uppercase tracking-[0.38em] text-accent">{children}</p>;
}

// Full-bleed tinted band, standing in for the alternating colour blocks of the brand layout.
function Band({ id, labelledBy, children }: { id: string; labelledBy: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className="scroll-mt-8 border-y border-line-soft bg-tint">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">{children}</div>
    </section>
  );
}

export function WhoWePlace() {
  return (
    <Band id="who-we-place" labelledBy="who-we-place-heading">
      <Eyebrow>Who we place</Eyebrow>
      <h2 id="who-we-place-heading" className="max-w-2xl text-[clamp(2.4rem,5.5vw,4rem)] leading-[1.02] tracking-tight text-fg" style={serif}>
        For the people behind the experience.
      </h2>

      {/* Three across, then two wider cards, so the five areas fill the grid evenly. */}
      <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {PLACEMENTS.map((p, i) => (
          <li
            key={p.title}
            className={`flex flex-col rounded-[1.6rem] border border-line bg-card p-6 shadow-card backdrop-blur-xl sm:p-7 ${
              i < 3 ? 'lg:col-span-2' : 'lg:col-span-3'
            } ${i === PLACEMENTS.length - 1 ? 'sm:col-span-2' : ''}`}
          >
            <span className="text-[0.66rem] tracking-[0.2em] text-accent">{pad(i)}</span>
            <h3 className="mt-3 text-[1.7rem] leading-[1.1] text-fg" style={serif}>{p.title}</h3>
            <p className="mt-3 mb-5 flex-1 text-sm leading-relaxed text-fg-muted">{p.roles}</p>
            <p className="border-t border-line pt-5 text-lg italic leading-snug text-fg" style={serif}>
              {p.line}
            </p>
          </li>
        ))}
      </ol>
    </Band>
  );
}

export function HowItWorks() {
  return (
    <Band id="how-it-works" labelledBy="how-it-works-heading">
      <Eyebrow>How it works</Eyebrow>
      <h2 id="how-it-works-heading" className="max-w-2xl text-[clamp(2.4rem,5.5vw,4rem)] leading-[1.02] tracking-tight text-fg" style={serif}>
        No black holes. Just a real conversation.
      </h2>

      <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {STEPS.map((step, i) => (
          <li key={step.title} className="border-t border-line-strong pt-6">
            <span className="text-[2.6rem] leading-none text-accent" style={serif}>{pad(i)}</span>
            <h3 className="mt-4 text-base font-semibold text-fg">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </Band>
  );
}

export function WhyRinwa() {
  return (
    <section aria-labelledby="why-heading" className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
      <div>
        <Eyebrow>Why RÌNWÁ</Eyebrow>
        <h2 id="why-heading" className="text-[clamp(2.4rem,5vw,3.6rem)] leading-[1.04] tracking-tight text-fg" style={serif}>
          Hiring is personal. <em className="text-accent">So is how we do it.</em>
        </h2>
      </div>
      <div className="space-y-5 text-base leading-relaxed text-fg-muted lg:pt-10">
        <p>
          We&apos;ve spent years sourcing the right people to bring a vision to life, from weddings to summits to hotel launches. We
          know the difference between a CV that looks good and a person who shows up brilliantly on the night.
        </p>
        <p>
          That&apos;s who we look for, and that&apos;s who our partners trust us to find. When we put your name forward, we put ours
          next to it.
        </p>
      </div>
    </section>
  );
}

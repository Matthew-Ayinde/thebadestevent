import type { Metadata } from 'next';
import Link from 'next/link';
import { CookieSettingsButton } from '@/components/analytics/CookieSettingsButton';

export const metadata: Metadata = {
  title: 'Privacy & Cookies',
  description: 'How RÌNWÁ collects, uses and protects your information, and the choices you have.',
  alternates: { canonical: '/privacy' },
};

const CONTACT_EMAIL = 'rinwahospitality@gmail.com';
const UPDATED = 'October 15, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-2xl text-fg sm:text-3xl">{title}</h2>
      <div className="space-y-3 text-[0.95rem] leading-relaxed text-fg-muted">{children}</div>
    </section>
  );
}

const COOKIES = [
  ['rw_consent', 'Remembers your cookie choice', 'Essential', '6 months'],
  ['rw_vid', 'Recognises your browser across visits', 'Analytics, only with consent', '12 months'],
  ['rw_sid', 'Groups page views into a single visit', 'Analytics, only with consent', '30 minutes of inactivity'],
  ['Theme preference', 'Remembers light or dark mode (stored in your browser, not a cookie)', 'Functional', 'Until cleared'],
];

export default function PrivacyPage() {
  return (
    <main className="site-backdrop min-h-screen px-5 py-16 text-fg sm:px-8 sm:py-24">
      <article className="mx-auto max-w-3xl space-y-12">
        <header className="space-y-4">
          <Link href="/" className="text-xs uppercase tracking-[0.28em] text-accent hover:text-accent-hover">
            ← RÌNWÁ
          </Link>
          <h1 className="font-serif text-4xl text-fg sm:text-5xl">Privacy & Cookies</h1>
          <p className="text-fg-subtle">Last updated {UPDATED}</p>
          <p className="leading-relaxed text-fg-muted">
            RÌNWÁ Hospitality & Experiences (&ldquo;RÌNWÁ&rdquo;, &ldquo;we&rdquo;) respects your privacy. This page
            explains what we collect when you visit our website, book a conversation, apply for a role or RSVP to an
            event, why we collect it, and the choices you have.
          </p>
        </header>

        <Section title="Your cookie choices">
          <p>When you first visit, we ask whether you accept analytics cookies. You can change your mind at any time:</p>
          <CookieSettingsButton />
        </Section>

        <Section title="What we collect">
          <p>
            <strong className="text-fg">Information you give us.</strong> When you fill in one of our forms we collect
            what you enter:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-fg">Event questionnaire:</strong> your name, email, phone, company and the details
              of the event you&apos;re planning.
            </li>
            <li>
              <strong className="text-fg">Meeting booking:</strong> your name, email, what you&apos;d like to discuss and
              the time you book.
            </li>
            <li>
              <strong className="text-fg">Job applications:</strong> your contact details, location, links you share,
              your cover letter and answers, and the CV you upload.
            </li>
            <li>
              <strong className="text-fg">Event RSVPs:</strong> your name and email, used to send your invitation and
              entry pass and to check you in at the door.
            </li>
          </ul>
          <p>
            <strong className="text-fg">If you accept analytics cookies</strong>, we also record:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>the pages you view, how long you stay, how far you scroll, how far you get through our forms, and links you click (such as WhatsApp, phone or email links)</li>
            <li>how you reached us (the referring website and any campaign tags in the link)</li>
            <li>your IP address and the approximate location derived from it (country, region, city)</li>
            <li>your device type and model, browser, operating system, screen and window size, language, timezone and connection type</li>
          </ul>
          <p>
            If you then submit one of our forms, we link the details you entered to these visits so we understand
            your journey and can serve you better.
          </p>
          <p>
            <strong className="text-fg">If you choose &ldquo;Essential only&rdquo; or don&apos;t choose</strong>, we
            set no analytics cookies and store no IP address. We only count your visit anonymously, using a short-lived
            code that changes every day and cannot identify you. We also use Vercel&apos;s privacy-friendly, cookieless
            performance metrics, which never identify individual visitors.
          </p>
        </Section>

        <Section title="Cookies and storage we use">
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-tint text-xs uppercase tracking-widest text-fg-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Purpose</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Kept for</th>
                </tr>
              </thead>
              <tbody className="text-fg-muted">
                {COOKIES.map(([name, purpose, type, kept]) => (
                  <tr key={name} className="border-t border-line-soft">
                    <td className="px-4 py-3 font-mono text-xs">{name}</td>
                    <td className="px-4 py-3">{purpose}</td>
                    <td className="px-4 py-3">{type}</td>
                    <td className="px-4 py-3">{kept}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="How we use it">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>to respond to your enquiries, plan the experiences you ask about, and arrange the meetings you book</li>
            <li>to review job applications and contact applicants</li>
            <li>to manage event guest lists and check-in</li>
            <li>to understand which pages, campaigns and partners bring people to RÌNWÁ, and improve our website</li>
            <li>to keep our website secure, for example by limiting abusive or automated requests</li>
          </ul>
          <p>
            We rely on your consent for analytics cookies, and on our legitimate interest or on taking steps at your
            request for handling the forms you submit. We do not sell your personal information.
          </p>
        </Section>

        <Section title="Who can see it and where it's stored">
          <p>
            Only authorised RÌNWÁ staff can view analytics and form submissions. Our data is stored with our hosting,
            database, email, file-storage and scheduling providers, which may process it outside your country under
            appropriate safeguards.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Depending on where you live (including under the Nigeria Data Protection Act, the UK and EU GDPR, and
            Canada&apos;s PIPEDA), you may ask us to access, correct or delete the information we hold about you, or
            object to how we use it. You can withdraw cookie consent at any time using the button above.
          </p>
          <p>
            To make a request, email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
            . You also have the right to complain to your local data protection authority.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this page from time to time. When we make significant changes to how we use cookies, we will
            ask for your consent again.
          </p>
        </Section>
      </article>
    </main>
  );
}

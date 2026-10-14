import type { Metadata } from 'next';
import Link from 'next/link';
import { CookieSettingsButton } from '@/components/analytics/CookieSettingsButton';

export const metadata: Metadata = {
  title: 'Privacy & Cookies',
  description: 'How RÌNWÁ collects, uses and protects your information, and the choices you have.',
  alternates: { canonical: '/privacy' },
};

const CONTACT_EMAIL = 'rinwahospitality@gmail.com';
const UPDATED = 'October 14, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-2xl text-white/90 sm:text-3xl">{title}</h2>
      <div className="space-y-3 text-[0.95rem] leading-relaxed text-white/65">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#041114] px-5 py-16 sm:px-8 sm:py-24">
      <article className="mx-auto max-w-3xl space-y-12">
        <header className="space-y-4">
          <Link href="/" className="text-xs uppercase tracking-[0.28em] text-teal-300/70 hover:text-teal-200">
            ← RÌNWÁ
          </Link>
          <h1 className="font-serif text-4xl text-white/95 sm:text-5xl">Privacy & Cookies</h1>
          <p className="text-white/55">Last updated {UPDATED}</p>
          <p className="leading-relaxed text-white/65">
            RÌNWÁ Hospitality & Experiences (&ldquo;RÌNWÁ&rdquo;, &ldquo;we&rdquo;) respects your privacy. This page
            explains what we collect when you visit our website or fill in one of our forms, why we collect it, and
            the choices you have.
          </p>
        </header>

        <Section title="Your cookie choices">
          <p>
            When you first visit, we ask whether you accept analytics cookies. You can change your mind at any time:
          </p>
          <CookieSettingsButton />
        </Section>

        <Section title="What we collect">
          <p>
            <strong className="text-white/85">Information you give us.</strong> When you fill in a form (such as our
            homecoming questionnaire, event questionnaire, guest check-in or contact form) we collect what you enter,
            for example your name, email, phone number, company and your answers.
          </p>
          <p>
            <strong className="text-white/85">If you accept analytics cookies</strong>, we also set a first-party
            cookie (<code className="text-teal-200/80">rw_vid</code>, kept for 12 months) that lets us recognise your
            browser on return visits, and we record:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>the pages you view, how long you stay, how far you scroll, and links you click (such as WhatsApp, phone or email links)</li>
            <li>how you reached us (the referring website and any campaign tags in the link)</li>
            <li>your IP address and the approximate location derived from it (country, region, city)</li>
            <li>your device type and model, browser, operating system, screen size, language, timezone and connection type</li>
          </ul>
          <p>
            If you later submit one of our forms, we link the details you entered to these visits so we understand
            your journey and can serve you better.
          </p>
          <p>
            <strong className="text-white/85">If you choose &ldquo;Essential only&rdquo; or don&apos;t choose</strong>,
            we set no analytics cookie and store no IP address. We only count your page views anonymously, using a
            short-lived code that changes every day and cannot identify you.
          </p>
        </Section>

        <Section title="Cookies we use">
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.1em] text-white/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Purpose</th>
                  <th className="px-4 py-3 font-medium">Kept for</th>
                </tr>
              </thead>
              <tbody className="text-white/70">
                <tr className="border-t border-white/8">
                  <td className="px-4 py-3 font-mono text-xs">rw_consent</td>
                  <td className="px-4 py-3">Remembers your cookie choice (essential)</td>
                  <td className="px-4 py-3">6 months</td>
                </tr>
                <tr className="border-t border-white/8">
                  <td className="px-4 py-3 font-mono text-xs">rw_vid</td>
                  <td className="px-4 py-3">Recognises your browser across visits (analytics, only with consent)</td>
                  <td className="px-4 py-3">12 months</td>
                </tr>
                <tr className="border-t border-white/8">
                  <td className="px-4 py-3 font-mono text-xs">rw_session</td>
                  <td className="px-4 py-3">Groups page views into a visit (analytics, only with consent, stored in your browser)</td>
                  <td className="px-4 py-3">30 minutes of inactivity</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="How we use it">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>to respond to your enquiries and plan the experiences you ask us about</li>
            <li>to understand which pages, campaigns and partners bring people to RÌNWÁ, and improve our website</li>
            <li>to keep our website secure, for example by limiting abusive or automated requests</li>
          </ul>
          <p>
            We rely on your consent for analytics cookies, and on our legitimate interest or on taking steps at your
            request for handling the forms you submit. We do not sell your personal information. We only share your
            details with partners if you explicitly ask us to (for example, by opting in to partner offers).
          </p>
        </Section>

        <Section title="Who can see it and where it's stored">
          <p>
            Only authorised RÌNWÁ administrators can view analytics and form submissions. Our data is stored with our
            hosting and database providers, which may process it outside your country under appropriate safeguards.
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
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-teal-200 underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
            . You also have the right to complain to your local data protection authority.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this page from time to time. When we make significant changes to how we use cookies, we
            will ask for your consent again.
          </p>
        </Section>
      </article>
    </main>
  );
}

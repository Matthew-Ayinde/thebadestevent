import type { Metadata } from 'next';
import Link from 'next/link';
import { CookieSettingsButton } from '@/components/analytics/CookieSettingsButton';

export const metadata: Metadata = {
  title: 'Privacy & Cookies',
  description: 'How RÌNWÁ collects, uses and protects your information, and the choices you have.',
  alternates: { canonical: '/privacy' },
};

const CONTACT_EMAIL = 'info@rinwahospitality.com';
const UPDATED = 'October 30, 2026';

const SECTIONS = [
  { id: 'who-we-are', title: 'Who we are' },
  { id: 'cookie-choices', title: 'Your cookie choices' },
  { id: 'what-we-collect', title: 'What we collect' },
  { id: 'stories', title: 'Came Home stories and photos' },
  { id: 'cookies', title: 'Cookies we use' },
  { id: 'how-we-use', title: 'How we use it, and why we may' },
  { id: 'transfers', title: 'Where it is stored' },
  { id: 'retention', title: 'How long we keep it' },
  { id: 'security', title: 'How we protect it' },
  { id: 'rights', title: 'Your rights' },
  { id: 'children', title: 'Children' },
  { id: 'changes', title: 'Changes to this policy' },
  { id: 'contact', title: 'Contact us' },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-10 space-y-3">
      <h2 className="font-serif text-2xl text-white/90 sm:text-3xl">{title}</h2>
      <div className="space-y-3 text-[0.95rem] leading-relaxed text-white/65">{children}</div>
    </section>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="text-white/85">{children}</strong>;
}

function Mail() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="text-teal-200 underline underline-offset-4">
      {CONTACT_EMAIL}
    </a>
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
            RÌNWÁ Hospitality & Experiences (&ldquo;RÌNWÁ&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) respects your
            privacy. This page explains what we collect when you visit our website or fill in one of our forms, why we
            collect it, who we share it with, how long we keep it, and the choices and rights you have.
          </p>
        </header>

        <nav aria-label="On this page" className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-white/40">On this page</p>
          <ol className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-white/65 hover:text-teal-200">
                  <span className="mr-2 tabular-nums text-white/30">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <Section id="who-we-are" title="Who we are">
          <p>
            RÌNWÁ Hospitality & Experiences is responsible (the &ldquo;data controller&rdquo;) for the personal
            information described on this page. If you have any question about it, or want to use any of your rights,
            email <Mail />.
          </p>
        </Section>

        <Section id="cookie-choices" title="Your cookie choices">
          <p>
            When you first visit, we ask whether you accept analytics cookies. You can change your mind at any time:
          </p>
          <CookieSettingsButton />
        </Section>

        <Section id="what-we-collect" title="What we collect">
          <p>
            <Strong>Information you give us.</Strong> When you fill in one of our forms we collect what you enter:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <Strong>Homecoming check-in:</Strong> your name, how to reach you (WhatsApp, email or phone), where you
              are travelling from, your travel plans (dates, length of stay, who you are travelling with, where you
              will stay and your rough budget), what you would like help with, and whether you would like partner
              offers.
            </li>
            <li>
              <Strong>Came Home stories:</Strong> how you would like to be credited (full name, nickname or
              anonymous), where you moved back from, the year you returned, an optional photo, your story, any social
              media handles you choose to add, whether we may tag you, your answers about your move, and whether you
              allow us to share your story. See <a href="#stories" className="text-teal-200 underline underline-offset-4">Came Home stories and photos</a>.
            </li>
            <li>
              <Strong>Guest check-in, event questionnaire and contact form:</Strong> your name and contact details
              where asked, and your answers and messages.
            </li>
          </ul>
          <p>
            Please don&apos;t include sensitive details (for example about your health, religion or immigration
            status) in free-text answers unless you are comfortable with us holding them.
          </p>
          <p>
            <Strong>Information we collect to keep the site working and secure.</Strong> To stop spam and abuse, we
            briefly record your IP address each time you submit a form or your browser reports a visit, so we can
            limit repeated requests. These records are deleted automatically, at most about 16 minutes later. Our
            hosting provider also keeps standard technical logs of requests to the website.
          </p>
          <p>
            <Strong>If you accept analytics cookies</Strong>, we also set a first-party cookie (
            <code className="text-teal-200/80">rw_vid</code>, kept for 12 months) that lets us recognise your browser
            on return visits, and we record:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>the pages you view, how long you stay, how far you scroll, and links you click (such as WhatsApp, phone or email links)</li>
            <li>how you reached us (the referring website and any campaign tags in the link)</li>
            <li>how far you get through our forms, and any error messages you see along the way</li>
            <li>your IP address and the approximate location derived from it (country, region, city)</li>
            <li>your device type and model, browser, operating system, screen size, language, timezone and connection type</li>
          </ul>
          <p>
            If you later submit one of our forms, we link the details you entered to these visits so we understand
            your journey and can serve you better.
          </p>
          <p>
            <Strong>If you choose &ldquo;Essential only&rdquo; or don&apos;t choose</Strong>, we set no analytics
            cookie and keep no analytics record of your IP address. We only count your page views and form progress
            anonymously, using a short-lived code that changes every day and cannot identify you.
          </p>
        </Section>

        <Section id="stories" title="Came Home stories and photos">
          <p>
            When you share a story, you choose whether RÌNWÁ may share it publicly. If you choose to keep it private,
            only our team will read it, and we use it only to understand and improve how we support people moving
            home.
          </p>
          <p>If you allow us to share it:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Our team reviews every story before anything is published. Not every story is featured.
            </li>
            <li>
              We may feature it on our website and in RÌNWÁ content, including our social media. We credit you the way
              you chose: your full name, your nickname, or &ldquo;Anonymous&rdquo;.
            </li>
            <li>
              What can appear publicly: your credit name, where you moved back from, the year you returned, your
              photo, your story, and what went through your mind when you landed. Your social media handle appears
              only if you said we may tag you, and never if you chose to stay anonymous.
            </li>
            <li>
              Your other answers (what help you wished for and what you wish you had been prepared for) are never
              published with your name. We may quote them anonymously, for example in a summary of what people tell
              us.
            </li>
          </ul>
          <p>
            <Strong>Photos.</Strong> Only upload a photo you have the right to share, and only include other people
            if they are happy to appear. We resize photos in your browser before uploading them, which usually removes
            hidden information such as the location where the photo was taken.
          </p>
          <p>
            <Strong>Changing your mind.</Strong> You can ask us to take your story or photo down, or to delete it
            entirely, at any time by emailing <Mail />. We will remove it from our website and stop using it in new
            content. We can&apos;t always recall copies that others have already saved or reshared, for example on
            social media, but we will remove our own posts where we can.
          </p>
        </Section>

        <Section id="cookies" title="Cookies we use">
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
          <p>We don&apos;t use advertising cookies, and we don&apos;t let other companies track you on our website.</p>
        </Section>

        <Section id="how-we-use" title="How we use it, and why we may">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <Strong>To respond to you and plan what you ask us about</Strong>, such as your homecoming, an event or
              an enquiry, including sending you a confirmation email when you give us your email address. We do this
              to take the steps you asked for, and because it is in our legitimate interest to run our business.
            </li>
            <li>
              <Strong>To publish your Came Home story</Strong>, only if you have given your consent, which you can
              withdraw at any time.
            </li>
            <li>
              <Strong>To understand and improve our services</Strong>, using form answers and anonymous visit counts.
              This is our legitimate interest, and we keep it proportionate.
            </li>
            <li>
              <Strong>To measure our website in detail with analytics cookies</Strong>, only with your consent.
            </li>
            <li>
              <Strong>To keep our website secure</Strong>, for example by limiting abusive or automated requests. This
              is our legitimate interest.
            </li>
            <li>
              <Strong>To send you partner offers</Strong>, only if you opt in, and only for as long as you want them.
            </li>
          </ul>
          <p>
            We don&apos;t make decisions about you using only automated means, and we don&apos;t use your information
            for advertising profiles.
          </p>
        </Section>

        <Section id="transfers" title="Where it is stored">
          <p>
            Our service providers may store and process your information outside the country where you live,
            for example in the United States. Where the law requires it, we rely on appropriate
            safeguards for these transfers, such as the providers&apos; standard data protection terms.
          </p>
        </Section>

        <Section id="retention" title="How long we keep it">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <Strong>Form submissions</Strong> are kept for as long as we need them to respond to you and provide what
              you asked for, and to understand how we can serve people better. We then delete them or keep them only
              in a form that no longer identifies you.
            </li>
            <li>
              <Strong>Published Came Home stories and photos</Strong> stay up until you ask us to remove them, or until
              we decide to take them down. Deleting a story also deletes its photo from our photo storage.
            </li>
            <li>
              <Strong>Analytics data</Strong> is kept only for as long as it is useful for understanding how our
              website is used.
            </li>
            <li>
              <Strong>Anti-abuse records</Strong> of IP addresses are deleted automatically, at most about 16 minutes
              after they are created.
            </li>
            <li>
              <Strong>Cookies</Strong> last for the periods listed in the cookie table above, or until you clear them
              or change your cookie choice.
            </li>
          </ul>
          <p>You can ask us to delete your information sooner at any time.</p>
        </Section>

        <Section id="security" title="How we protect it">
          <p>
            We protect your information with encrypted (HTTPS) connections, password-protected administrator accounts,
            access limited to authorised RÌNWÁ staff, and limits on repeated requests. No website can be completely
            secure, but if we ever learn of a breach that puts your information at risk, we will tell you and the
            relevant authorities where the law requires us to.
          </p>
        </Section>

        <Section id="rights" title="Your rights">
          <p>
            Depending on where you live (including under the Nigeria Data Protection Act, the UK and EU GDPR, and
            Canada&apos;s PIPEDA), you have the right to:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>ask what information we hold about you and get a copy of it</li>
            <li>ask us to correct information that is wrong or incomplete</li>
            <li>ask us to delete your information</li>
            <li>object to, or ask us to restrict, how we use your information</li>
            <li>receive the information you gave us in a portable format</li>
            <li>withdraw your consent at any time (for analytics cookies, story publication or partner offers), without affecting anything we did before</li>
          </ul>
          <p>
            To make a request, email <Mail />. We may need to confirm your identity before acting on it, and we will
            reply within one month. There is no charge. You can withdraw cookie consent yourself at any time using the
            button in <a href="#cookie-choices" className="text-teal-200 underline underline-offset-4">Your cookie choices</a>.
          </p>
          <p>
            If you are unhappy with how we have handled your information, please tell us first so we can try to put
            it right. You also have the right to complain to a data protection authority, such as the Nigeria Data
            Protection Commission, the UK Information Commissioner&apos;s Office, your local EU data protection
            authority, or the Office of the Privacy Commissioner of Canada.
          </p>
        </Section>

        <Section id="children" title="Children">
          <p>
            Our website and forms are meant for adults. We don&apos;t knowingly collect information from anyone under
            18. If you believe a child has sent us their details, email <Mail /> and we will delete them.
          </p>
        </Section>

        <Section id="changes" title="Changes to this policy">
          <p>
            We may update this page from time to time, and we will change the &ldquo;last updated&rdquo; date at the
            top when we do. If we make significant changes to how we use your information or cookies, we will make
            that clear on our website and, where required, ask for your consent again.
          </p>
        </Section>

        <Section id="contact" title="Contact us">
          <p>
            For any privacy question or request, email <Mail />.
          </p>
        </Section>
      </article>
    </main>
  );
}

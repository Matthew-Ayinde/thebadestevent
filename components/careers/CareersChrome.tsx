import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/rinwa/ThemeToggle';

export const serif = { fontFamily: 'var(--font-serif)' } as const;

export function CareersBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="site-backdrop absolute inset-0" />
      <Image
        src="/images/logo.png"
        alt=""
        width={720}
        height={720}
        priority={false}
        className="theme-logo absolute -right-48 top-16 hidden w-[46rem] max-w-none opacity-[0.018] md:block"
      />
    </div>
  );
}

const SECTION_LINKS = [
  { href: '#who-we-place', label: 'Who we place' },
  { href: '#roles', label: 'Open roles' },
  { href: '#how-it-works', label: 'How it works' },
];

// `sections` shows the in-page navigation used on the main careers page.
export function CareersTopBar({ back, sections }: { back?: { href: string; label: string }; sections?: boolean }) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pt-8 sm:px-8 sm:pt-10">
      <Link href="/" className="group flex items-center gap-3" aria-label="RÌNWÁ home">
        <Image src="/images/logo.png" alt="" width={34} height={34} className="theme-logo opacity-90 transition group-hover:opacity-100" />
        <div className="leading-none">
          <p className="text-base tracking-[0.14em] text-fg" style={serif}>RÌNWÁ</p>
          <p className="mt-1 text-[0.66rem] uppercase tracking-[0.34em] text-accent">Careers</p>
        </div>
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        {sections && (
          <>
            <nav aria-label="Careers sections" className="mr-2 hidden items-center gap-6 lg:flex">
              {SECTION_LINKS.map(link => (
                <a key={link.href} href={link.href} className="text-sm text-fg-muted transition hover:text-fg">
                  {link.label}
                </a>
              ))}
            </nav>
            <a
              href="#talent-circle"
              className="rounded-full bg-accent px-4 py-2.5 text-xs font-semibold text-on-accent transition hover:bg-accent-hover sm:px-5 sm:text-sm"
            >
              <span className="sm:hidden">Join the circle</span>
              <span className="hidden sm:inline">Join the talent circle</span>
            </a>
          </>
        )}
        {back && (
          <Link
            href={back.href}
            className="group flex items-center gap-2 rounded-full border border-line bg-tint px-4 py-2.5 text-xs text-fg-muted transition hover:border-line-strong hover:bg-tint-strong hover:text-fg"
          >
            <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
            <span className="sr-only min-[400px]:not-sr-only">{back.label}</span>
          </Link>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}

export function SignOff() {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-[0.66rem] uppercase tracking-[0.55em] text-accent">Enter Into Your Ease</p>
      <div className="flex items-center gap-4">
        <div className="h-px w-14 bg-accent/25" />
        <Image src="/images/logo.png" alt="" width={20} height={20} className="theme-logo opacity-30" />
        <div className="h-px w-14 bg-accent/25" />
      </div>
    </div>
  );
}

export function CareersFooter({ contactEmail }: { contactEmail?: string }) {
  return (
    <footer className="relative z-10 mx-auto mt-24 flex w-full max-w-6xl flex-col items-center gap-10 px-5 pb-12 sm:px-8">
      <SignOff />
      <div className="flex flex-col items-center gap-2 text-center text-xs text-fg-faint sm:flex-row sm:gap-3">
        <p>{`© ${new Date().getFullYear()} RÌNWÁ Hospitality & Experiences · Lagos`}</p>
        {contactEmail && (
          <>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <a href={`mailto:${contactEmail}`} className="text-accent underline underline-offset-4 transition hover:text-accent-hover">
              {contactEmail}
            </a>
          </>
        )}
      </div>
    </footer>
  );
}

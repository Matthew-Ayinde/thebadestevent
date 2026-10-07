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

export function CareersTopBar({ back }: { back?: { href: string; label: string } }) {
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

export function CareersFooter() {
  return (
    <footer className="relative z-10 mx-auto mt-24 flex w-full max-w-6xl flex-col items-center gap-10 px-5 pb-12 sm:px-8">
      <SignOff />
      <p className="text-center text-xs text-fg-faint">
        {`© ${new Date().getFullYear()} RÌNWÁ Hospitality & Experiences`}
      </p>
    </footer>
  );
}

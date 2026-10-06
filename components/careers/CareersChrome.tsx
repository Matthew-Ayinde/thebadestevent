import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const serif = { fontFamily: 'var(--font-serif)' } as const;

export function CareersBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(125,211,207,0.13),transparent_38%),radial-gradient(circle_at_88%_12%,rgba(15,118,110,0.18),transparent_30%),linear-gradient(180deg,#07171a_0%,#041114_70%)]" />
      <Image
        src="/images/logo.png"
        alt=""
        width={720}
        height={720}
        priority={false}
        className="absolute -right-48 top-16 hidden w-[46rem] max-w-none opacity-[0.018] md:block"
      />
    </div>
  );
}

export function CareersTopBar({ back }: { back?: { href: string; label: string } }) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pt-8 sm:px-8 sm:pt-10">
      <Link href="/" className="group flex items-center gap-3" aria-label="RÌNWÁ home">
        <Image src="/images/logo.png" alt="" width={34} height={34} className="opacity-90 transition group-hover:opacity-100" />
        <div className="leading-none">
          <p className="text-base tracking-[0.14em] text-white/90" style={serif}>RÌNWÁ</p>
          <p className="mt-1 text-[0.55rem] uppercase tracking-[0.34em] text-[#7dd3cf]/60">Careers</p>
        </div>
      </Link>

      {back && (
        <Link
          href={back.href}
          className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white/60 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
          {back.label}
        </Link>
      )}
    </header>
  );
}

export function SignOff() {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-[0.58rem] uppercase tracking-[0.55em] text-[#7dd3cf]/50">Enter Into Your Ease</p>
      <div className="flex items-center gap-4">
        <div className="h-px w-14 bg-[#7dd3cf]/25" />
        <Image src="/images/logo.png" alt="" width={20} height={20} className="opacity-30" />
        <div className="h-px w-14 bg-[#7dd3cf]/25" />
      </div>
    </div>
  );
}

export function CareersFooter() {
  return (
    <footer className="relative z-10 mx-auto mt-24 flex w-full max-w-6xl flex-col items-center gap-10 px-5 pb-12 sm:px-8">
      <SignOff />
      <p className="text-center text-xs text-white/30">
        {`© ${new Date().getFullYear()} RÌNWÁ Hospitality & Experiences`}
      </p>
    </footer>
  );
}

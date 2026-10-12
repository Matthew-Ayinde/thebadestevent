import Image from 'next/image';
import { MEDALLION_EVENT } from '@/lib/hotel-medallion';

export function MedallionLogo({ size = 72, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src={MEDALLION_EVENT.logoPath}
      alt={MEDALLION_EVENT.hotel}
      width={size}
      height={size}
      priority
      unoptimized
      className={`object-contain ${className}`}
    />
  );
}

export function MedallionWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      <MedallionLogo size={compact ? 52 : 84} />
      <p className="mt-4 text-[0.65rem] uppercase tracking-[0.5em] text-(--hm-accent)">Hotel</p>
      <p className={`font-serif uppercase tracking-[0.18em] text-(--hm-cream) ${compact ? 'text-2xl' : 'text-4xl sm:text-5xl'}`}>
        Medallion
      </p>
    </div>
  );
}

export function AccentRule({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden>
      <span className="h-px w-12 bg-linear-to-r from-transparent to-(--hm-accent)/70" />
      <span className="size-1.5 rotate-45 bg-(--hm-accent)" />
      <span className="h-px w-12 bg-linear-to-l from-transparent to-(--hm-accent)/70" />
    </div>
  );
}

export function PrContact() {
  return (
    <p className="text-center text-xs leading-relaxed text-(--hm-dim)">
      For PR inquiries, contact {MEDALLION_EVENT.prContactName}{' '}
      <a
        href={`mailto:${MEDALLION_EVENT.prContactEmail}`}
        className="text-(--hm-accent) underline-offset-4 hover:underline"
      >
        {MEDALLION_EVENT.prContactEmail}
      </a>
    </p>
  );
}

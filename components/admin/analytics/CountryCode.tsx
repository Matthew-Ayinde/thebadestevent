// Flag emoji don't render on Windows, so countries get a small code badge instead.
export default function CountryCode({ code }: { code?: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-[1.15rem] min-w-[1.6rem] shrink-0 items-center justify-center rounded border border-white/10 bg-white/5 px-1 font-mono text-[0.6rem] font-semibold tracking-wide text-white/55"
    >
      {code && /^[A-Z]{2}$/.test(code) ? code : '··'}
    </span>
  );
}

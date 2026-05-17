import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/8 px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 RÌNWÁ Hospitality & Experiences. All rights reserved.</p>
        <div>
          <Link href={'/admin'}>Admin</Link>
        </div>
        <p>Hospitality, storytelling, and curated moments.</p>
      </div>
    </footer>
  );
}

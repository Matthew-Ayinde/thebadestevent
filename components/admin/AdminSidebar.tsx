'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  Menu,
  X,
  LayoutDashboard,
  Trophy,
  Archive,
  MonitorPlay,
  Briefcase,
  Handshake,
  Inbox,
  ClipboardList,
  MessageSquareQuote,
  Settings2,
  LogOut,
  Home,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  // { href: '/admin/featured-events', label: 'Featured Events', icon: Trophy },
  // { href: '/admin/past-events', label: 'Past Events', icon: Archive },
  // { href: '/admin/hero-slides', label: 'Hero Slides', icon: MonitorPlay },
  // { href: '/admin/brand-partners', label: 'Brand Partners', icon: Handshake },
  // { href: '/admin/job-postings', label: 'Job Postings', icon: Briefcase },
  // { href: '/admin/submissions', label: 'Submissions', icon: Inbox },
  { href: '/admin/questionnaire', label: 'Questionnaire', icon: ClipboardList },
  { href: '/admin/ourdiaspora', label: 'Homecoming', icon: Home },
  { href: '/admin/ourguests', label: 'Guest Experience', icon: Sparkles },
  // { href: '/admin/testimonials', label: 'Testimonials', icon: MessageSquareQuote },
  // { href: '/admin/settings', label: 'Settings', icon: Settings2 },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  async function handleLogout() {
    await signOut({ redirect: true, callbackUrl: '/admin/login' });
  }

  return (
    <>
      {/* Mobile topbar — logo left, hamburger right */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-[#07171a]/95 backdrop-blur-xl border-b border-white/8 md:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/images/logo-home.png"
            alt="RÌNWÁ"
            width={26}
            height={26}
            className="object-contain opacity-90"
          />
          <div>
            <p className="font-serif text-sm text-white/90 leading-none">RÌNWÁ</p>
            <p className="text-[0.58rem] uppercase tracking-[0.18em] text-teal-300/60 leading-none mt-0.5">Admin</p>
          </div>
        </Link>

        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Sidebar — z-50 so it slides over the topbar */}
      <aside
        className={`fixed md:static top-0 left-0 h-screen w-64 bg-[#07171a] border-r border-white/10 flex flex-col z-50 md:z-auto transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo + close button */}
        <div className="relative px-6 py-6 border-b border-white/10 overflow-hidden">
          {/* Faint watermark */}
          <div className="pointer-events-none select-none absolute -right-4 -bottom-4 opacity-[0.07]">
            <Image src="/images/logo-home.png" alt="" width={100} height={100} className="object-contain" />
          </div>

          <div className="relative flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 cursor-pointer">
              <Image
                src="/images/logo-home.png"
                alt="RÌNWÁ"
                width={38}
                height={38}
                className="object-contain opacity-90"
              />
              <div>
                <h1 className="font-serif text-lg text-white/90 leading-none">RÌNWÁ</h1>
                <p className="text-[0.6rem] uppercase tracking-[0.18em] text-teal-300/60 mt-1 leading-none">Admin Console</p>
              </div>
            </Link>

            {/* Close button — mobile only */}
            <button
              onClick={() => setIsOpen(false)}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition"
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/admin'
              ? pathname === item.href
              : (pathname === item.href || pathname.startsWith(item.href + '/'));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition duration-300 ${
                  isActive
                    ? 'bg-teal-300/15 text-teal-100 border border-teal-300/30'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info & logout */}
        <div className="px-4 py-4 border-t border-white/10 space-y-4">
          <div className="px-4 py-3 rounded-lg bg-white/5">
            <p className="text-xs text-white/40 uppercase tracking-[0.1em]">Logged in as</p>
            <p className="text-sm text-white/90 truncate mt-1">{session?.user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 transition duration-300 text-sm font-medium"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
        />
      )}
    </>
  );
}

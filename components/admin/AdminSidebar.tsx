'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Menu, LayoutGrid, Image, Play, Users, MessageSquare, Settings, LogOut } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutGrid },
  { href: '/admin/hero-slides', label: 'Hero Slides', icon: Image },
  { href: '/admin/brand-partners', label: 'Brand Partners', icon: Users },
  { href: '/admin/events', label: 'Events', icon: Play },
  { href: '/admin/media', label: 'Media Gallery', icon: Image },
  { href: '/admin/submissions', label: 'Submissions', icon: MessageSquare },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
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
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-40 p-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition md:hidden"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed md:static top-0 left-0 h-screen w-64 bg-white/5 border-r border-white/10 backdrop-blur-sm flex flex-col z-30 transform transition-transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="px-6 py-8 border-b border-white/10">
          <h1 className="font-serif text-xl text-white/90">RÌNWÁ</h1>
          <p className="text-xs text-white/40 uppercase tracking-[0.1em] mt-1">Admin</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
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
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
        />
      )}
    </>
  );
}

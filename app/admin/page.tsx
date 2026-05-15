'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, MessageSquare, Image, Loader } from 'lucide-react';

interface DashboardStats {
  totalEvents: number;
  totalSubmissions: number;
  totalPartners: number;
  totalMedia: number;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    totalSubmissions: 0,
    totalPartners: 0,
    totalMedia: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [eventsRes, submissionsRes, partnersRes, mediaRes] = await Promise.all([
          fetch('/api/events'),
          fetch('/api/submissions'),
          fetch('/api/brand-partners'),
          fetch('/api/media'),
        ]);

        const events = await eventsRes.json();
        const { submissions, total: totalSubmissions } = await submissionsRes.json();
        const partners = await partnersRes.json();
        const media = await mediaRes.json();

        setStats({
          totalEvents: Array.isArray(events) ? events.length : 0,
          totalSubmissions: totalSubmissions || 0,
          totalPartners: Array.isArray(partners) ? partners.length : 0,
          totalMedia: Array.isArray(media) ? media.length : 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 text-teal-300 mx-auto mb-4 animate-spin" />
          <p className="text-white/70">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Events',
      value: stats.totalEvents,
      icon: Calendar,
      color: 'from-teal-500/20 to-transparent',
    },
    {
      title: 'Form Submissions',
      value: stats.totalSubmissions,
      icon: MessageSquare,
      color: 'from-blue-500/20 to-transparent',
    },
    {
      title: 'Brand Partners',
      value: stats.totalPartners,
      icon: Users,
      color: 'from-purple-500/20 to-transparent',
    },
    {
      title: 'Media Items',
      value: stats.totalMedia,
      icon: Image,
      color: 'from-pink-500/20 to-transparent',
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-12">
        <h1 className="font-serif text-4xl text-white/90 mb-2">Welcome, {session?.user?.name}</h1>
        <p className="text-white/50">Manage your RÌNWÁ content and events</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`bg-gradient-to-br ${card.color} border border-white/10 rounded-[1.8rem] p-6 backdrop-blur-sm hover:border-white/20 transition duration-300`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm uppercase tracking-[0.1em] text-white/60 font-medium">
                  {card.title}
                </h3>
                <Icon className="w-5 h-5 text-white/40" />
              </div>
              <p className="font-serif text-3xl text-white/90">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white/5 border border-white/10 rounded-[2.25rem] p-8 backdrop-blur-sm">
        <h2 className="font-serif text-2xl text-white/90 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Add New Event', href: '/admin/events' },
            { label: 'Upload Media', href: '/admin/media' },
            { label: 'View Submissions', href: '/admin/submissions' },
            { label: 'Manage Partners', href: '/admin/brand-partners' },
          ].map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="p-4 rounded-xl bg-teal-300/10 border border-teal-300/30 text-teal-100 hover:bg-teal-300/20 transition duration-300 text-center font-medium"
            >
              {action.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

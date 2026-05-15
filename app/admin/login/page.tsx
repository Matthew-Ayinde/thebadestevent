'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error || 'Login failed');
      } else if (result?.ok) {
        toast.success('Login successful!');
        router.push('/admin');
        router.refresh();
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07171a] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-sm">
          <h1 className="font-serif text-[2.5rem] text-white/90 mb-2">RÌNWÁ</h1>
          <p className="text-white/50 text-sm uppercase tracking-[0.26em] mb-8">
            Admin Console
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-[0.26em] text-white/50 font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-white/10 rounded-lg bg-[#041114]/60 px-4 py-2 text-white/90 placeholder-white/30 transition duration-300 focus:border-teal-300/50 focus:bg-[#07171a] focus:outline-none focus:shadow-[0_0_0_4px_rgba(125,211,207,0.08)]"
                placeholder="admin@example.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.26em] text-white/50 font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-white/10 rounded-lg bg-[#041114]/60 px-4 py-2 text-white/90 placeholder-white/30 transition duration-300 focus:border-teal-300/50 focus:bg-[#07171a] focus:outline-none focus:shadow-[0_0_0_4px_rgba(125,211,207,0.08)]"
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-teal-300 px-6 py-3 text-sm font-semibold text-slate-950 transition duration-300 hover:bg-teal-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-xs text-white/40 mt-6 text-center">
            Contact support for account issues
          </p>
        </div>
      </div>
    </div>
  );
}

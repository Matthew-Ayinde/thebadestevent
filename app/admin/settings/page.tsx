'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import AdminButton from '@/components/admin/AdminButton';
import AdminInput from '@/components/admin/AdminInput';
import AdminTextarea from '@/components/admin/AdminTextarea';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

const SettingsSchema = z.object({
  partnershipEmail: z.string().email('Invalid email'),
  tagline: z.string().min(1, 'Tagline is required'),
  siteUrl: z.string().url('Invalid URL'),
  analyticsId: z.string().optional(),
});

type SettingsFormData = z.infer<typeof SettingsSchema>;

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(SettingsSchema),
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setIsLoading(true);
      const res = await fetch('/api/settings');
      const data = await res.json();

      setValue('partnershipEmail', data.partnershipEmail);
      setValue('tagline', data.tagline);
      setValue('siteUrl', data.siteUrl);
      setValue('analyticsId', data.analyticsId || '');
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(data: SettingsFormData) {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      toast.success('Settings updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    }
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-4xl text-white/90">Settings</h1>
        <p className="text-white/50 mt-2">Manage global site settings</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white/5 border border-white/10 rounded-[2.25rem] p-8 backdrop-blur-sm space-y-6">
        <AdminInput
          label="Partnership Email"
          type="email"
          {...register('partnershipEmail')}
          error={errors.partnershipEmail?.message}
          required
        />

        <AdminTextarea
          label="Tagline"
          rows={2}
          {...register('tagline')}
          error={errors.tagline?.message}
          required
        />

        <AdminInput
          label="Site URL"
          type="url"
          {...register('siteUrl')}
          error={errors.siteUrl?.message}
          required
        />

        <AdminInput
          label="Analytics ID (optional)"
          placeholder="UA-xxxxxxxxx"
          {...register('analyticsId')}
          error={errors.analyticsId?.message}
        />

        <div className="flex gap-4 pt-4 border-t border-white/10">
          <AdminButton
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Saving...' : 'Save Settings'}
          </AdminButton>
        </div>
      </form>
    </div>
  );
}

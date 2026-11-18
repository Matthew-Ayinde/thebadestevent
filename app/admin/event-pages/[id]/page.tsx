'use client';

import { use } from 'react';
import EventSiteEditor from '@/components/admin/EventSiteEditor';

// Handles both /admin/event-pages/new (optionally ?from=<id> to duplicate) and /admin/event-pages/<id>.
export default function EventPageEditorRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = use(params);
  const { from } = use(searchParams);
  return <EventSiteEditor key={`${id}-${from ?? ''}`} id={id} fromId={id === 'new' ? from : undefined} />;
}

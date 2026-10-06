import { Suspense } from 'react';
import { requireEmployer } from '@/lib/me-server';
import { TeamCalendarView } from './team-calendar-view';

export default async function TeamCalendarPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireEmployer((await params).slug);
  return (
    <Suspense>
      <TeamCalendarView />
    </Suspense>
  );
}

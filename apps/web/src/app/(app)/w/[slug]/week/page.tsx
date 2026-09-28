import { Suspense } from 'react';
import { requireEmployer } from '@/lib/me-server';
import { WeekView } from './week-view';

export default async function WeekPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireEmployer((await params).slug);
  return (
    <Suspense>
      <WeekView />
    </Suspense>
  );
}

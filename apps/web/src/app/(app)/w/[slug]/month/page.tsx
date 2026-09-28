import { Suspense } from 'react';
import { requireEmployer } from '@/lib/me-server';
import { EmployerMonthView } from './employer-month-view';

export default async function EmployeeMonthPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireEmployer((await params).slug);
  return (
    <Suspense>
      <EmployerMonthView />
    </Suspense>
  );
}

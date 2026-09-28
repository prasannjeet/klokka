import { Suspense } from 'react';
import { EmployeeWeek } from '@/components/employee-week';
import { requireMember } from '@/lib/me-server';
import { WeekView } from './week-view';

// The employer's week grid, or the employee's own week as a list (CHQ-145).
export default async function WeekPage({ params }: { params: Promise<{ slug: string }> }) {
  const ws = await requireMember((await params).slug);
  return <Suspense>{ws.role === 'EMPLOYER' ? <WeekView /> : <EmployeeWeek />}</Suspense>;
}

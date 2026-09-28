import { requireEmployer } from '@/lib/me-server';
import { EmployeesView } from './employees-view';

export default async function EmployeesPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireEmployer((await params).slug);
  return <EmployeesView />;
}

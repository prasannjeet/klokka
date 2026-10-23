import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { JobEditor } from '@/components/jobs/job-editor';
import { parseEditorParams, parseNewJobMode, safeBack } from '@/lib/job-links';
import { requireEmployer } from '@/lib/me-server';

// A new job (CHQ-185): `single` from a day's Add, `full` (New job) from the person's view or the employees list.
export default async function NewJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  await requireEmployer(slug);
  const search = await searchParams;
  const editor = parseEditorParams(search);
  const mode = parseNewJobMode(search);
  if (!editor || !mode) notFound();
  return (
    <Suspense>
      <JobEditor
        membershipId={editor.member}
        date={editor.date}
        mode={mode}
        back={safeBack(editor.back, slug)}
      />
    </Suspense>
  );
}

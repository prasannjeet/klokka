import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { JobEditor } from '@/components/jobs/job-editor';
import { parseEditorParams, safeBack } from '@/lib/job-links';
import { requireEmployer } from '@/lib/me-server';

// One job to change or remove (CHQ-185), and for a recurring one its schedule or a range of its series (CHQ-187).
export default async function EditJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; jobId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug, jobId } = await params;
  await requireEmployer(slug);
  const editor = parseEditorParams(await searchParams);
  if (!editor) notFound();
  return (
    <Suspense>
      <JobEditor
        key={jobId}
        membershipId={editor.member}
        date={editor.date}
        mode="edit"
        jobId={jobId}
        back={safeBack(editor.back, slug)}
      />
    </Suspense>
  );
}

'use client';

// A day's jobs (CHQ-156): one card per job and, for the employer while the month is open, Add and Edit through the
// job editor page (CHQ-185: Add makes a single job on this day) and Remove here, scoped for a series (CHQ-187).
// The employee sees the same cards to read, with Directions.
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Job, JobChangeScope } from '@klokka/api-client';
import type { IsoDate } from '@klokka/core';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { jobEditorHref } from '@/lib/job-links';
import { problemMessage, toProblem } from '@/lib/problem';
import { invalidateFigures } from '@/lib/queries';
import { firstName } from '@/lib/visual';
import type { WorkspaceView } from '@/lib/workspace';
import { Dialog } from '../dialog';
import { Icon } from '../icons';
import { useToast } from '../toast';
import { JobCard } from './job-card';
import { ScopeStep } from './scope-step';
import './jobs.css';

export interface DayJobsEditing {
  membershipId: string;
  personName: string;
  locked: boolean;
}

// Where the editor returns to: this page, showing this person and this day.
function useBackHref(membershipId: string | undefined, date: IsoDate): string {
  const pathname = usePathname() ?? '';
  const search = useSearchParams();
  const params = new URLSearchParams(search?.toString() ?? '');
  if (membershipId) params.set('member', membershipId);
  params.set('day', date);
  return `${pathname}?${params.toString()}`;
}

export function DayJobs({
  ws,
  date,
  jobs,
  editing,
}: {
  ws: WorkspaceView;
  date: IsoDate;
  jobs: readonly Job[];
  editing?: DayJobsEditing;
}) {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();
  const back = useBackHref(editing?.membershipId, date);
  const [removing, setRemoving] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const writable = editing !== undefined && !editing.locked;

  const remove = useMutation({
    mutationFn: ({ job, scope }: { job: Job; scope?: JobChangeScope }) =>
      api.jobs.deleteJob({ workspaceId: ws.id, jobId: job.id, ...(scope ? { scope } : {}) }),
    onSuccess: () => {
      toast({ title: t('jobs.removed'), icon: 'check' });
      setRemoving(null);
    },
    onError: async (e) => setError(problemMessage(t, await toProblem(e))),
    onSettled: () => void invalidateFigures(queryClient, ws.id),
  });

  const close = () => {
    setRemoving(null);
    setError(null);
  };

  return (
    <div className="day-jobs">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          workspaceId={ws.id}
          job={job}
          busy={remove.isPending}
          {...(writable
            ? {
                editHref: jobEditorHref(ws.slug, {
                  member: editing.membershipId,
                  date,
                  mode: 'edit',
                  jobId: job.id,
                  back,
                }),
                onRemove: () => {
                  setError(null);
                  setRemoving(job);
                },
              }
            : {})}
        />
      ))}
      {writable ? (
        <Link
          className={jobs.length === 0 ? 'btn btn-primary' : 'btn btn-ghost add-job'}
          href={jobEditorHref(ws.slug, { member: editing.membershipId, date, mode: 'single', back })}
          data-testid="add-job"
        >
          <Icon name="plus" />
          {jobs.length === 0
            ? t('jobs.addJobFor', { name: firstName(editing.personName) })
            : t('jobs.addAnother')}
        </Link>
      ) : null}
      <Dialog open={removing !== null} onClose={close} title={t('jobs.removeConfirm')}>
        {removing?.recurrence ? (
          <ScopeStep
            workspaceId={ws.id}
            jobId={removing.id}
            action="remove"
            scheduleChange={false}
            onConfirm={(scope) => remove.mutate({ job: removing, scope })}
            busy={remove.isPending}
            error={error}
          />
        ) : (
          <>
            {error ? (
              <p className="err" role="alert">
                {error}
              </p>
            ) : null}
            <div className="dlg-actions">
              <button className="btn btn-ghost" type="button" onClick={close}>
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-primary"
                type="button"
                disabled={remove.isPending}
                onClick={() => removing && remove.mutate({ job: removing })}
              >
                <Icon name="trash" />
                {t('jobs.removeJob')}
              </button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

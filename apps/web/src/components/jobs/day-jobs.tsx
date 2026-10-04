'use client';

// A day's jobs (CHQ-156): one card per job and, for the employer while the month is open, Add, Edit and
// Remove through the job dialog. The employee sees the same cards to read, with Directions.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Job, Rounding } from '@klokka/api-client';
import type { IsoDate } from '@klokka/core';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { problemMessage, toProblem } from '@/lib/problem';
import { invalidateFigures } from '@/lib/queries';
import { firstName } from '@/lib/visual';
import type { WorkspaceView } from '@/lib/workspace';
import { Dialog } from '../dialog';
import { Icon } from '../icons';
import { useToast } from '../toast';
import { JobCard } from './job-card';
import { JobDialog } from './job-dialog';
import './jobs.css';

export interface DayJobsEditing {
  membershipId: string;
  personName: string;
  rounding: Rounding;
  defaultDayHours: number;
  locked: boolean;
}

export function DayJobs({
  ws,
  date,
  jobs,
  dayTotal,
  editing,
}: {
  ws: WorkspaceView;
  date: IsoDate;
  jobs: readonly Job[];
  dayTotal: number;
  editing?: DayJobsEditing;
}) {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<{ job: Job | null } | null>(null);
  const [removing, setRemoving] = useState<Job | null>(null);
  const writable = editing !== undefined && !editing.locked;

  const remove = useMutation({
    mutationFn: (job: Job) => api.jobs.deleteJob({ workspaceId: ws.id, jobId: job.id }),
    onSuccess: () => toast({ title: t('jobs.removed'), icon: 'check' }),
    onError: async (e) => toast({ title: problemMessage(t, await toProblem(e)), tone: 'error' }),
    onSettled: () => {
      setRemoving(null);
      void invalidateFigures(queryClient, ws.id);
    },
  });

  return (
    <div className="day-jobs">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          workspaceId={ws.id}
          job={job}
          busy={remove.isPending}
          {...(writable ? { onEdit: () => setDialog({ job }), onRemove: () => setRemoving(job) } : {})}
        />
      ))}
      {writable ? (
        <button
          className={jobs.length === 0 ? 'btn btn-primary' : 'btn btn-ghost add-job'}
          type="button"
          onClick={() => setDialog({ job: null })}
          data-testid="add-job"
        >
          <Icon name="plus" />
          {jobs.length === 0
            ? t('jobs.addJobFor', { name: firstName(editing.personName) })
            : t('jobs.addAnother')}
        </button>
      ) : null}
      {editing ? (
        <JobDialog
          ws={ws}
          open={dialog !== null}
          onClose={() => setDialog(null)}
          membershipId={editing.membershipId}
          personName={editing.personName}
          date={date}
          job={dialog?.job ?? null}
          rounding={editing.rounding}
          defaultDayHours={editing.defaultDayHours}
          dayTotal={dayTotal}
        />
      ) : null}
      <Dialog open={removing !== null} onClose={() => setRemoving(null)} title={t('jobs.removeConfirm')}>
        <div className="dlg-actions">
          <button className="btn btn-ghost" type="button" onClick={() => setRemoving(null)}>
            {t('common.cancel')}
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={remove.isPending}
            onClick={() => removing && remove.mutate(removing)}
          >
            <Icon name="trash" />
            {t('jobs.removeJob')}
          </button>
        </div>
      </Dialog>
    </div>
  );
}

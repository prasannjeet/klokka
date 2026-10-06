'use client';

// The team's jobs on one date (CHQ-171, the overview's today and the team calendar's day): every job by start
// time (jobs without one last), each with its map, who does it and where it stands against the workspace clock.
import type { Entry, Job } from '@klokka/api-client';
import { jobStatus, type IsoDate } from '@klokka/core';
import { clockIn, todayIn } from '@/lib/time';
import { useWorkspace } from '@/lib/workspace';
import { JobCard } from './jobs/job-card';

export function teamJobs(entries: readonly Entry[]): { job: Job; entry: Entry }[] {
  return entries
    .flatMap((entry) => entry.jobs.map((job) => ({ job, entry })))
    .sort((a, b) => {
      const x = a.job.startTime ?? '99:99';
      const y = b.job.startTime ?? '99:99';
      return x === y ? a.entry.memberName.localeCompare(b.entry.memberName) : x < y ? -1 : 1;
    });
}

export function TeamJobs({ entries, date }: { entries: readonly Entry[]; date: IsoDate }) {
  const ws = useWorkspace();
  const today = todayIn(ws.timezone);
  const { h, m } = clockIn(ws.timezone);
  const people = [...new Set(entries.map((e) => e.membershipId))];
  return (
    <div className="day-jobs">
      {teamJobs(entries).map(({ job, entry }) => (
        <JobCard
          key={job.id}
          workspaceId={ws.id}
          job={job}
          member={{ name: entry.memberName, index: people.indexOf(entry.membershipId) }}
          status={jobStatus(job, date, today, h * 60 + m)}
        />
      ))}
    </div>
  );
}

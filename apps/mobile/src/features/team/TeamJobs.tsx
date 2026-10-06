import { StyleSheet, View } from 'react-native';
import type { Entry, Job } from '@klokka/api-client';
import { jobStatus, type IsoDate } from '@klokka/core';
import { minutesNowIn, todayIn } from '@/lib/dates';
import { useThemedStyles, type Theme } from '@/theme';
import { JobCard } from '@/features/jobs/JobCard';

const styles = (t: Theme) => StyleSheet.create({ list: { gap: t.space[3] } });

export interface TeamJob {
  job: Job;
  entry: Entry;
}

// Every job of a day across the team, by start time (jobs without one last), then by person.
export function teamJobs(entries: readonly Entry[] | undefined): TeamJob[] {
  const all = (entries ?? []).flatMap((entry) => entry.jobs.map((job) => ({ job, entry })));
  return all.sort((a, b) => {
    const x = a.job.startTime ?? '99:99';
    const y = b.job.startTime ?? '99:99';
    return x === y ? a.entry.memberName.localeCompare(b.entry.memberName) : x < y ? -1 : 1;
  });
}

// The team's jobs on one date (CHQ-171, Home and the team day): each card names the person and where the
// job stands against the workspace clock; the employer edits through `onEdit` while the month is open.
export function TeamJobs({
  entries,
  date,
  workspaceId,
  timezone,
  onEdit,
}: {
  entries: readonly Entry[] | undefined;
  date: IsoDate;
  workspaceId: string;
  timezone: string;
  onEdit?: ((item: TeamJob) => void) | undefined;
}) {
  const s = useThemedStyles(styles);
  const today = todayIn(timezone);
  const minutes = minutesNowIn(timezone);
  return (
    <View style={s.list}>
      {teamJobs(entries).map((item) => (
        <JobCard
          key={item.job.id}
          job={item.job}
          workspaceId={workspaceId}
          memberName={item.entry.memberName}
          status={jobStatus(item.job, date, today, minutes)}
          onEdit={onEdit && !item.entry.locked ? () => onEdit(item) : undefined}
        />
      ))}
    </View>
  );
}

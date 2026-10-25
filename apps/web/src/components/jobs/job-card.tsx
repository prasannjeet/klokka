'use client';

// One job on a day (CHQ-156): the map when it has a place, its title (CHQ-191) or else where, the place under a
// title, when ("09:00 to 13:30"), how long ("4 h 30 min"), the note, and Directions. The employer also gets Edit (the job editor page, CHQ-185) and Remove.
import Link from 'next/link';
import type { Job } from '@klokka/api-client';
import { jobLabel, type JobStatus, type MessageKey } from '@klokka/core';
import { useT } from '@/lib/i18n';
import { directionsUrl, formatDuration, timeRange } from '@/lib/jobs';
import { Avatar } from '../avatar';
import { Icon } from '../icons';
import { RecurrenceSummary } from './recurrence-summary';
import { MapImage } from './map-image';

const STATUS: Record<JobStatus, { key: MessageKey; cls: string }> = {
  done: { key: 'team.statusDone', cls: 'pill ok' },
  now: { key: 'team.statusNow', cls: 'pill ink live' },
  later: { key: 'team.statusLater', cls: 'pill' },
};

// The team views (CHQ-171) add who does the job (`member`) and where it stands against the clock (`status`).
export function JobCard({
  workspaceId,
  job,
  editHref,
  onRemove,
  busy,
  member,
  status,
}: {
  workspaceId: string;
  job: Job;
  editHref?: string;
  onRemove?: () => void;
  busy?: boolean;
  member?: { name: string; index: number };
  status?: JobStatus | null;
}) {
  const t = useT();
  const range = timeRange(job, t);
  const place = job.location;
  const label = jobLabel(job);
  // With a title the place moves to the line under it; without one the place is the heading, as before.
  const placeLine = job.title?.trim() && place ? place.name : null;
  return (
    <article className="job-card" data-testid={`job-${job.id}`}>
      {place ? <MapImage workspaceId={workspaceId} location={place} width={360} height={110} /> : null}
      <div className="job-body">
        {member || status ? (
          <div className="job-who">
            {member ? <Avatar name={member.name} index={member.index} size="sm" /> : null}
            <span className="job-who-name">{member?.name}</span>
            {status ? (
              <span className={STATUS[status].cls}>
                {status === 'now' ? <span className="dot" aria-hidden="true" /> : null}
                {t(STATUS[status].key)}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="job-top">
          <div className="job-where">
            <b>{label ?? t('jobs.noLocation')}</b>
            {placeLine ? <span className="job-place">{placeLine}</span> : null}
            {range || place?.address ? (
              <span>{[range, place?.address].filter(Boolean).join(', ')}</span>
            ) : null}
          </div>
          <span className="job-hours">{formatDuration(job.hours, t)}</span>
        </div>
        {job.recurrence ? <RecurrenceSummary series={job.recurrence} /> : null}
        {job.note ? <q className="job-note">{job.note}</q> : null}
        {place || editHref || onRemove ? (
          <div className="job-acts">
            {place ? (
              <a
                className="btn btn-ghost btn-sm"
                href={directionsUrl(place)}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="navigate" />
                {t('jobs.directions')}
              </a>
            ) : null}
            {editHref ? (
              <Link className="btn btn-ghost btn-sm" href={editHref}>
                <Icon name="edit" />
                {t('jobs.edit')}
              </Link>
            ) : null}
            {onRemove ? (
              <button
                className="btn btn-ghost btn-sm danger"
                type="button"
                onClick={onRemove}
                disabled={busy}
              >
                <Icon name="trash" />
                {t('jobs.removeJob')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

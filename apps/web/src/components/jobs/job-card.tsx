'use client';

// One job on a day (CHQ-156): the map when it has a place, where, when ("09:00 to 13:30"), how long
// ("4 h 30 min"), the note, and Directions. The employer also gets Edit and Remove.
import type { Job } from '@klokka/api-client';
import { useT } from '@/lib/i18n';
import { directionsUrl, formatDuration, timeRange } from '@/lib/jobs';
import { Icon } from '../icons';
import { RecurrenceSummary } from './recurrence-summary';
import { MapImage } from './map-image';

export function JobCard({
  workspaceId,
  job,
  onEdit,
  onRemove,
  busy,
}: {
  workspaceId: string;
  job: Job;
  onEdit?: () => void;
  onRemove?: () => void;
  busy?: boolean;
}) {
  const t = useT();
  const range = timeRange(job, t);
  const place = job.location;
  return (
    <article className="job-card" data-testid={`job-${job.id}`}>
      {place ? <MapImage workspaceId={workspaceId} location={place} width={360} height={110} /> : null}
      <div className="job-body">
        <div className="job-top">
          <div className="job-where">
            <b>{place ? place.name : t('jobs.noLocation')}</b>
            {range || place?.address ? (
              <span>{[range, place?.address].filter(Boolean).join(', ')}</span>
            ) : null}
          </div>
          <span className="job-hours">{formatDuration(job.hours, t)}</span>
        </div>
        {job.recurrence ? <RecurrenceSummary series={job.recurrence} /> : null}
        {job.note ? <q className="job-note">{job.note}</q> : null}
        {place || onEdit || onRemove ? (
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
            {onEdit ? (
              <button className="btn btn-ghost btn-sm" type="button" onClick={onEdit} disabled={busy}>
                <Icon name="edit" />
                {t('jobs.edit')}
              </button>
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

'use client';

// Who changed what, when (CHQ-119): the entry's change log from the API, newest last, for both roles.
import type { EntryChange } from '@klokka/api-client';
import { formatHours } from '@klokka/core';
import { formatDayTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { useEntryHistory } from '@/lib/queries';
import { firstName } from '@/lib/visual';

export function EntryHistory({
  workspaceId,
  entryId,
  timeZone,
}: {
  workspaceId: string;
  entryId: string;
  timeZone: string;
}) {
  const t = useT();
  const locale = useLocale();
  const history = useEntryHistory(workspaceId, entryId);
  const h = (value: number | null | undefined) => formatHours(value ?? 0, locale);

  function line(change: EntryChange): string {
    const name = firstName(change.changedBy.name);
    switch (change.kind) {
      case 'CREATED':
        return t('entry.historyLogged', { name, hours: h(change.hoursAfter) });
      case 'UPDATED':
        return t('entry.historyChanged', {
          name,
          before: h(change.hoursBefore),
          after: h(change.hoursAfter),
        });
      case 'DELETED':
        return t('entry.historyRemoved', { name, hours: h(change.hoursBefore) });
      case 'FLAGGED':
        return t('entry.historyFlagged', { name });
      case 'FLAG_FIXED':
        return t('entry.historyFlagFixed', { name, hours: h(change.hoursAfter) });
      case 'FLAG_DISMISSED':
        return t('entry.historyFlagDismissed', { name, hours: h(change.hoursAfter ?? change.hoursBefore) });
      default:
        return name;
    }
  }

  if (history.isPending) return <p className="muted small">{t('common.loading')}</p>;
  if (history.isError) return <p className="muted small">{t('errors.INTERNAL')}</p>;
  return (
    <ol className="hist" aria-label={t('entry.history')}>
      {history.data.map((change) => (
        <li key={change.id}>
          <span>{line(change)}</span>
          {change.noteAfter && change.noteAfter !== change.noteBefore ? (
            <span className="hist-note">{t('web.week.noteLabel', { note: change.noteAfter })}</span>
          ) : null}
          <time dateTime={change.changedAt.toISOString()}>
            {formatDayTime(change.changedAt, locale, timeZone)}
          </time>
        </li>
      ))}
    </ol>
  );
}

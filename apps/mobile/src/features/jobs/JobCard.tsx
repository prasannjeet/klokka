import { Linking, StyleSheet, View } from 'react-native';
import type { Job } from '@klokka/api-client';
import { useT } from '@/i18n/LocaleProvider';
import { formatDuration } from '@/lib/duration';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Avatar, Icon, Pill, type PillTone } from '@/ui';
import type { MessageKey } from '@klokka/core';
import type { JobStatus } from './jobStatus';
import { RecurrenceSummary } from './RecurrenceSummary';
import { MapImage, directionsUrl } from './MapImage';

const styles = (t: Theme) =>
  StyleSheet.create({
    card: {
      borderRadius: t.radius.card,
      backgroundColor: t.color.surface,
      borderWidth: 1,
      borderColor: t.color.border,
      overflow: 'hidden',
    },
    body: { padding: t.space[4], gap: t.space[2] },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space[3] },
    pin: {
      width: 44,
      height: 44,
      borderRadius: t.radius.md,
      backgroundColor: t.color.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actions: { flexDirection: 'row', gap: t.space[2], flexWrap: 'wrap' },
    who: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[1],
      minHeight: t.tapMin,
      paddingHorizontal: t.space[3],
      borderRadius: t.radius.pill,
      backgroundColor: t.color.surface2,
    },
  });

export function endTime(start: string, hours: number): string {
  const [h, m] = start.split(':').map(Number) as [number, number];
  const total = (h * 60 + m + Math.round(hours * 60)) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const STATUS: Record<JobStatus, { key: MessageKey; tone: PillTone }> = {
  done: { key: 'team.statusDone', tone: 'success' },
  now: { key: 'team.statusNow', tone: 'primary' },
  later: { key: 'team.statusLater', tone: 'neutral' },
};

// One job on a day (CHQ-156): the map when it has a place, where, when, how long, the note, and
// Directions; Edit for the employer. The team views (CHQ-171) add who does it and where it stands.
export function JobCard({
  job,
  workspaceId,
  onEdit,
  memberName,
  status,
}: {
  job: Job;
  workspaceId: string;
  onEdit?: (() => void) | undefined;
  memberName?: string | undefined;
  status?: JobStatus | null | undefined;
}) {
  const t = useT();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const location = job.location ?? null;
  const when = job.startTime
    ? t('jobs.timeRange', { from: job.startTime, to: endTime(job.startTime, job.hours) })
    : null;
  return (
    <View style={s.card} testID={`job-${job.id}`}>
      {location ? <MapImage workspaceId={workspaceId} location={location} height={96} /> : null}
      <View style={s.body}>
        {memberName || status ? (
          <View style={s.who}>
            {memberName ? (
              <>
                <Avatar name={memberName} size={24} />
                <AppText variant="small" weight={600} numberOfLines={1} style={{ flex: 1 }}>
                  {memberName}
                </AppText>
              </>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {status ? (
              <Pill
                label={t(STATUS[status].key)}
                tone={STATUS[status].tone}
                testID={`job-status-${job.id}`}
              />
            ) : null}
          </View>
        ) : null}
        <View style={s.head}>
          {location ? null : (
            <View style={s.pin}>
              <Icon name="briefcase" size={20} color={theme.color.pop1} />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <AppText weight={700} numberOfLines={2}>
              {location ? location.name : t('jobs.noLocation')}
            </AppText>
            {when || location?.address ? (
              <AppText variant="small" tone="muted" numberOfLines={2}>
                {[when, location?.address].filter(Boolean).join(', ')}
              </AppText>
            ) : null}
          </View>
          <AppText variant="h3" weight={700} tabular>
            {formatDuration(job.hours, t)}
          </AppText>
        </View>
        {job.recurrence ? <RecurrenceSummary series={job.recurrence} /> : null}
        {job.note ? <AppText>{`"${job.note}"`}</AppText> : null}
        {location || onEdit ? (
          <View style={s.actions}>
            {location ? (
              <AppPressable
                accessibilityRole="link"
                accessibilityLabel={t('jobs.directionsInMaps')}
                onPress={() => void Linking.openURL(directionsUrl(location))}
                style={s.action}
                testID={`job-directions-${job.id}`}
              >
                <Icon name="navigation" size={16} />
                <AppText variant="small" weight={600}>
                  {t('jobs.directions')}
                </AppText>
              </AppPressable>
            ) : null}
            {onEdit ? (
              <AppPressable
                accessibilityRole="button"
                accessibilityLabel={t('jobs.edit')}
                onPress={onEdit}
                style={s.action}
                testID={`job-edit-${job.id}`}
              >
                <Icon name="edit" size={16} />
                <AppText variant="small" weight={600}>
                  {t('jobs.edit')}
                </AppText>
              </AppPressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

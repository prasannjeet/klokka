import { StyleSheet, View } from 'react-native';
import type { Entry, Member } from '@klokka/api-client';
import { formatDate, formatHours, formatHoursDelta, sumHours, type IsoDate } from '@klokka/core';
import { sameDate } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Avatar, Card, Icon, Pill } from '@/ui';

const styles = (t: Theme) =>
  StyleSheet.create({
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[3],
      minHeight: 56,
      paddingVertical: t.space[2],
    },
    dayLabel: { width: 44 },
    dayBody: { flex: 1, minWidth: 0 },
    hours: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
    plus: {
      width: 36,
      height: 36,
      borderRadius: t.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.color.surface2,
      borderWidth: 1,
      borderColor: t.color.border,
    },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: t.color.border },
    total: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingTop: t.space[3],
    },
    pageHeader: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], marginBottom: t.space[2] },
  });

export function entryFor(
  entries: Entry[] | undefined,
  membershipId: string,
  date: IsoDate,
): Entry | undefined {
  return entries?.find((e) => e.membershipId === membershipId && sameDate(e.workDate, date));
}

// One person's week (CHQ-118): a row per day with its hours or a plus, the week total and the change on last
// week. The team Week tab pages through these; the person screen shows one (CHQ-171), without the name.
// Totals here are sums of the visible entries (presentation).
export function WeekCard({
  member,
  week,
  previousWeek,
  entries,
  today,
  employer,
  onOpenDay,
  showName = true,
}: {
  member: Pick<Member, 'id' | 'displayName' | 'avatarEmoji'>;
  week: readonly IsoDate[];
  previousWeek: readonly IsoDate[];
  entries: Entry[] | undefined;
  today: IsoDate;
  employer: boolean;
  onOpenDay: (date: IsoDate) => void;
  showName?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const weekEntries = week.map((d) => entryFor(entries, member.id, d));
  const total = sumHours(weekEntries.map((e) => e?.hours ?? 0));
  const lastTotal = sumHours(previousWeek.map((d) => entryFor(entries, member.id, d)?.hours ?? 0));
  const delta =
    lastTotal > 0 || total > 0 ? (
      <Pill
        label={t('week.vsLastWeek', { delta: formatHoursDelta(total - lastTotal, locale) })}
        tone={total >= lastTotal ? 'success' : 'warning'}
        icon={total >= lastTotal ? 'trending-up' : 'trending-down'}
      />
    ) : null;
  return (
    <Card>
      {showName ? (
        <View style={s.pageHeader}>
          <Avatar name={member.displayName} emoji={member.avatarEmoji} colour="PURPLE" size={32} />
          <AppText variant="lead" weight={700} style={{ flex: 1 }} numberOfLines={1}>
            {member.displayName}
          </AppText>
          {delta}
        </View>
      ) : delta ? (
        <View style={s.pageHeader}>{delta}</View>
      ) : null}
      {week.map((date, i) => {
        const entry = weekEntries[i];
        const isToday = date === today;
        const jobs = entry?.jobs ?? [];
        const places = jobs.map((j) => j.location?.name).filter(Boolean);
        const subtitle =
          jobs.length > 1
            ? [t('jobs.jobCount', { count: jobs.length }), ...places].join(', ')
            : places.length > 0
              ? places.join(', ')
              : entry?.note
                ? entry.note
                : isToday
                  ? t('common.today')
                  : entry && entry.changeCount > 0
                    ? t('week.edited')
                    : undefined;
        return (
          <View key={date}>
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={t('week.addHoursForDay', {
                day: formatDate(date, locale, 'weekdayDayMonth'),
              })}
              onPress={() => onOpenDay(date)}
              pressScale={0.99}
              style={s.dayRow}
              testID={`day-${member.id}-${date}`}
            >
              <View style={s.dayLabel}>
                <AppText variant="eyebrow" tone={isToday ? 'primary' : 'muted'}>
                  {formatDate(date, locale, 'weekdayDay').split(' ')[0]}
                </AppText>
                <AppText variant="lead" weight={700} tone={isToday ? 'primary' : 'text'} tabular>
                  {formatDate(date, locale, 'day')}
                </AppText>
              </View>
              <View style={s.dayBody}>
                {subtitle ? (
                  <AppText variant="small" tone="muted" numberOfLines={1}>
                    {subtitle}
                  </AppText>
                ) : null}
              </View>
              {entry ? (
                <View style={s.hours}>
                  <AppText variant="h2" tabular>
                    {formatHours(entry.hours, locale, { unit: false })}
                  </AppText>
                  <AppText variant="small" weight={700} tone="muted">
                    {t('common.hourUnit')}
                  </AppText>
                </View>
              ) : employer ? (
                <View style={s.plus}>
                  <Icon name="plus" size={18} color={theme.color.text} />
                </View>
              ) : (
                <AppText variant="small" tone="muted">
                  {t('entry.nothingYet')}
                </AppText>
              )}
            </AppPressable>
            {i < week.length - 1 ? <View style={s.sep} /> : null}
          </View>
        );
      })}
      <View style={s.total}>
        <AppText weight={600}>{t('week.weekTotal')}</AppText>
        <View style={s.hours}>
          <AppText variant="h2" tabular>
            {formatHours(total, locale, { unit: false })}
          </AppText>
          <AppText variant="small" weight={700} tone="muted">
            {t('common.hourUnit')}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { addMonths, formatHours, formatMonth, formatMonthName, type IsoMonth } from '@klokka/core';
import { useMonthSummary } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { currentMonthIn, todayIn, toIsoDate } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, EmptyState, Header, Icon, Screen } from '@/ui';
import { withWorkspace, type WorkspaceProps } from '@/features/shell/withWorkspace';
import { HeatMapCalendar } from '@/features/month/HeatMapCalendar';

const styles = (t: Theme) =>
  StyleSheet.create({
    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.space[2] },
    navButton: {
      width: t.tapMin,
      height: t.tapMin,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radius.pill,
      backgroundColor: t.color.surface2,
    },
    navText: { flex: 1, alignItems: 'center', gap: 2 },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[3] },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
    dot: { width: 8, height: 8, borderRadius: 4 },
  });

// The team calendar (CHQ-171, the employer's third tab): every date of the month with the team's hours, a
// dot per person who worked; a tap opens that date's team day. Hours only, also when pay is on (the cells are
// small). Every figure is the month summary's read model (D9).
function TeamCalendarScreenInner({ workspace }: WorkspaceProps) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const [month, setMonth] = useState<IsoMonth>(currentMonthIn(workspace.timezone));
  const summary = useMonthSummary(workspace.workspaceId, month);
  const data = summary.data;
  // One colour per person, in the summary's member order (the chart order, never used for text).
  const colourOf = useMemo(() => {
    const colours = new Map<string, { colour: string; name: string }>();
    (data?.members ?? []).forEach((m, i) =>
      colours.set(m.membershipId, {
        colour: theme.color[theme.chartOrder[i % theme.chartOrder.length] as 'chart1'],
        name: m.name.split(' ')[0] ?? m.name,
      }),
    );
    return colours;
  }, [data?.members, theme]);
  const byDate = useMemo(() => new Map((data?.days ?? []).map((d) => [toIsoDate(d.date), d])), [data?.days]);
  const monthName = formatMonthName(month, locale);

  return (
    <Screen onRefresh={() => summary.refetch()} testID="team-calendar-screen">
      <Header title={t('nav.calendar')} subtitle={t('team.wholeTeam')} />
      <View style={s.nav}>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t('team.previousMonth')}
          onPress={() => setMonth(addMonths(month, -1))}
          style={s.navButton}
          testID="calendar-prev"
        >
          <Icon name="chevron-left" size={22} />
        </AppPressable>
        <View style={s.navText}>
          <AppText variant="h2" align="center">
            {formatMonth(month, locale, { capitalize: true })}
          </AppText>
          {data ? (
            <AppText variant="small" tone="muted" align="center" testID="calendar-total">
              {t('team.monthHours', { hours: formatHours(data.totalHours, locale), month: monthName })}
            </AppText>
          ) : null}
        </View>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t('team.nextMonth')}
          onPress={() => setMonth(addMonths(month, 1))}
          style={s.navButton}
          testID="calendar-next"
        >
          <Icon name="chevron-right" size={22} />
        </AppPressable>
      </View>
      {summary.isError ? (
        <EmptyState
          icon="alert"
          title={t('errors.NETWORK')}
          actionLabel={t('common.retry')}
          onAction={() => void summary.refetch()}
        />
      ) : null}
      {data ? (
        <>
          <HeatMapCalendar
            month={month}
            weekStart={workspace.weekStart}
            days={data.days}
            today={todayIn(workspace.timezone)}
            onPressDay={(date) => router.push({ pathname: '/team-day/[date]', params: { date } })}
            markers={(date) =>
              (byDate.get(date)?.membershipIds ?? []).flatMap((id) => {
                const person = colourOf.get(id);
                return person ? [person] : [];
              })
            }
            accessibilityLabel={t('team.calendarLabel', { month: monthName })}
          />
          <View style={s.legend}>
            {data.members
              .filter((m) => m.hours > 0)
              .map((m) => (
                <View key={m.membershipId} style={s.legendItem}>
                  <View style={[s.dot, { backgroundColor: colourOf.get(m.membershipId)?.colour }]} />
                  <AppText variant="caption" tone="muted">
                    {m.name.split(' ')[0]}
                  </AppText>
                </View>
              ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

export const TeamCalendarScreen = withWorkspace(TeamCalendarScreenInner);

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  addMonths,
  formatDate,
  formatHours,
  formatMoney,
  formatMonthName,
  formatPercentDelta,
  formatWeekday,
  previousMonth,
  WEEKDAYS,
} from '@klokka/core';
import { useWorkspaceInsights } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { currentMonthIn, toIsoDate } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Card, EmptyState, Header, Icon, Numeral, Pill, Screen } from '@/ui';
import { withWorkspace, type WorkspaceProps } from '@/features/shell/withWorkspace';
import { Bars, TrendLine } from './charts';

const styles = (t: Theme) =>
  StyleSheet.create({
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
    tiles: { flexDirection: 'row', gap: t.space[3] },
    tile: { flex: 1, gap: 2 },
    cardHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: t.space[3],
    },
    nav: { flexDirection: 'row', gap: t.space[2] },
    navButton: {
      width: t.tapMin,
      height: t.tapMin,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radius.pill,
      backgroundColor: t.color.surface2,
    },
  });

// Insights (CHQ-124, CHQ-126): every number comes from the API read model (D9). Labour cost appears
// only while pay is on (CHQ-128).
function InsightsScreenInner({ workspace }: WorkspaceProps) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const params = useLocalSearchParams<{ month?: string }>();
  const current = currentMonthIn(workspace.timezone);
  const [month, setMonth] = useState(typeof params.month === 'string' ? params.month : current);
  useEffect(() => {
    if (typeof params.month === 'string') setMonth(params.month);
  }, [params.month]);
  const insights = useWorkspaceInsights(workspace.workspaceId, month);
  const data = insights.data;
  const lastMonth = formatMonthName(previousMonth(month), locale, false);
  const monthName = formatMonthName(month, locale);
  const subtitle = data
    ? month === current
      ? t('month.through', { month: monthName, day: formatDate(toIsoDate(data.asOf), locale, 'day') })
      : monthName
    : monthName;

  return (
    <Screen onRefresh={() => insights.refetch()} testID="insights-screen">
      <Header
        title={t('insights.title')}
        subtitle={subtitle}
        back
        trailing={
          <View style={s.nav}>
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={t('month.previousMonth')}
              onPress={() => setMonth(previousMonth(month))}
              style={s.navButton}
              testID="insights-prev"
            >
              <Icon name="chevron-left" size={22} />
            </AppPressable>
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={t('month.nextMonth')}
              onPress={() => setMonth(addMonths(month, 1))}
              style={s.navButton}
              testID="insights-next"
            >
              <Icon name="chevron-right" size={22} />
            </AppPressable>
          </View>
        }
      />
      {insights.isError ? (
        <EmptyState
          icon="alert"
          title={t('errors.NETWORK')}
          actionLabel={t('common.retry')}
          onAction={() => void insights.refetch()}
        />
      ) : null}
      {data ? (
        <>
          <Numeral
            value={formatHours(data.totalHours, locale, { unit: false })}
            unit={t('common.hourUnit')}
            variant="displayXl"
            accessibilityLabel={t('overview.hoursInMonth', {
              hours: formatHours(data.totalHours, locale),
              month: monthName,
            })}
            testID="insights-total"
          />
          <View style={s.pills}>
            <Pill
              label={t('month.vsLastMonthAtPoint', {
                percent: formatPercentDelta(data.vsLastMonthAtSamePointPercent, locale),
                month: lastMonth,
              })}
              tone={data.vsLastMonthAtSamePointPercent >= 0 ? 'success' : 'warning'}
              icon={data.vsLastMonthAtSamePointPercent >= 0 ? 'trending-up' : 'trending-down'}
            />
            <Pill label={t('common.people', { count: data.activeMembers })} />
            {data.openFlags > 0 ? (
              <Pill label={t('flags.openFlags', { count: data.openFlags })} tone="warning" icon="flag" />
            ) : null}
          </View>
          <Card>
            <View style={s.cardHead}>
              <AppText variant="h3">{t('insights.perEmployee')}</AppText>
              <AppText variant="caption" tone="muted">
                {t('common.hours')}
              </AppText>
            </View>
            <Bars
              data={data.perMember.map((m) => ({
                key: m.membershipId,
                label: m.name.split(' ')[0] ?? m.name,
                value: m.hours,
                valueLabel: formatHours(m.hours, locale, { unit: false }),
              }))}
              accessibilityLabel={t('insights.perEmployee')}
            />
          </Card>
          <Card>
            <View style={s.cardHead}>
              <AppText variant="h3">{t('insights.weekByWeek')}</AppText>
              <AppText variant="caption" tone="muted">
                {t('insights.teamHours')}
              </AppText>
            </View>
            <TrendLine
              points={data.weekByWeek.map((w) => ({ isoWeek: w.isoWeek, hours: w.hours }))}
              accessibilityLabel={t('insights.teamHoursPerWeek', {
                values: data.weekByWeek.map((w) => formatHours(w.hours, locale, { unit: false })).join(', '),
              })}
            />
          </Card>
          <View style={s.tiles}>
            <Card style={s.tile}>
              <AppText variant="small" tone="muted">
                {t('insights.busiestDay')}
              </AppText>
              <AppText variant="h3">
                {data.busiestDay
                  ? formatWeekday(WEEKDAYS.indexOf(data.busiestDay.weekday), locale, 'long')
                  : '-'}
              </AppText>
              {data.busiestDay ? (
                <AppText variant="caption" tone="muted">
                  {t('overview.onAverage', { hours: formatHours(data.busiestDay.avgHours, locale) })}
                </AppText>
              ) : null}
            </Card>
            <Card style={s.tile}>
              <AppText variant="small" tone="muted">
                {t('insights.projectedMonthEnd')}
              </AppText>
              <Numeral
                value={formatHours(data.projectedMonthEndHours, locale, { unit: false })}
                unit={t('common.hourUnit')}
                variant="h2"
              />
              <AppText variant="caption" tone={data.projectedVsLastMonthPercent >= 0 ? 'success' : 'warning'}>
                {t('insights.vsLastMonthProjected', {
                  percent: formatPercentDelta(data.projectedVsLastMonthPercent, locale),
                  month: lastMonth,
                })}
              </AppText>
            </Card>
          </View>
          <View style={s.tiles}>
            {data.showPay && data.labourCost != null ? (
              <Card style={s.tile}>
                <AppText variant="small" tone="muted">
                  {t('insights.labourCost')}
                </AppText>
                <Numeral value={formatMoney(data.labourCost, data.currency, locale)} variant="h2" />
                <AppText variant="caption" tone="muted">
                  {t('overview.atEachRate')}
                </AppText>
              </Card>
            ) : null}
            <AppPressable
              onPress={() => router.navigate('/(tabs)/calendar')}
              accessibilityRole="button"
              accessibilityLabel={t('overview.nothingLoggedDays', { count: data.nothingLoggedDays.length })}
              style={s.tile}
              testID="nothing-logged"
            >
              <Card style={{ gap: 2 }}>
                <AppText variant="small" tone="muted">
                  {t('insights.nothingLogged')}
                </AppText>
                <Numeral
                  value={String(data.nothingLoggedDays.length)}
                  unit={t('common.days', { count: data.nothingLoggedDays.length }).replace(/^\d+\s*/, '')}
                  variant="h2"
                />
                <AppText variant="caption" tone="muted" numberOfLines={2}>
                  {data.nothingLoggedDays
                    .slice(0, 3)
                    .map((d) => formatDate(toIsoDate(d.date), locale, 'weekdayDay'))
                    .join(', ')}
                </AppText>
              </Card>
            </AppPressable>
          </View>
          <View style={s.pills}>
            <Pill
              label={
                t('overview.avgPerWorkingDay') +
                `: ${formatHours(data.avgHoursPerPersonPerWorkingDay, locale)} ${t('overview.perPersonAndDay')}`
              }
            />
          </View>
          <AppText variant="caption" tone="muted" align="center">
            {t('overview.numbersFromApi')}
          </AppText>
        </>
      ) : null}
      <View style={{ height: theme.space[2] }} />
    </Screen>
  );
}

export const InsightsScreen = withWorkspace(InsightsScreenInner);

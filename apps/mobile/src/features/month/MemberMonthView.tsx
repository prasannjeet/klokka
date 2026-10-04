import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { MemberMonth, MemberMonthDay } from '@klokka/api-client';
import {
  addMonths,
  formatDate,
  formatHours,
  formatHoursDelta,
  formatMoney,
  formatMonth,
  formatMonthName,
  formatTime,
  previousMonth,
  type IsoDate,
  type IsoMonth,
  type WeekStart,
} from '@klokka/core';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { toIsoDate } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Card, Icon, Numeral, Pill } from '@/ui';
import { HeatMapCalendar, flagFill, heatFills } from './HeatMapCalendar';

const styles = (t: Theme) =>
  StyleSheet.create({
    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    navButton: {
      width: t.tapMin,
      height: t.tapMin,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radius.pill,
      backgroundColor: t.color.surface2,
    },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
    tiles: { flexDirection: 'row', gap: t.space[3] },
    tile: { flex: 1 },
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[3],
      minHeight: 56,
      paddingVertical: t.space[2],
    },
    dayLabel: { width: 44 },
    dayBody: { flex: 1, minWidth: 0 },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: t.color.border },
    legend: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4 },
    swatch: { width: 10, height: 10, borderRadius: 3 },
    plannedSwatch: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.color.accent },
  });

export interface MemberMonthViewProps {
  data: MemberMonth;
  month: IsoMonth;
  weekStart: WeekStart;
  currency: string;
  today: IsoDate;
  timezone: string;
  onChangeMonth: (month: IsoMonth) => void;
  // "September, so far" for the current month, the plain month name otherwise.
  current: boolean;
  headerTitle?: ReactNode;
  // Extra rows under the calendar (the employer's lock and export, the employee's share).
  actions?: ReactNode;
  membershipId: string;
  streakDays?: number | undefined;
  // Averages, comparisons, best week and streak (CHQ-156: the employer may turn these off for employees).
  analysis?: boolean;
}

// The month shared by "My month" (employee) and the employer's per-employee month (CHQ-121/122):
// the biggest thing on screen is the total; then the pills, the tiles, the heat-map, the days.
export function MemberMonthView({
  data,
  month,
  weekStart,
  currency,
  today,
  timezone,
  onChangeMonth,
  current,
  headerTitle,
  actions,
  membershipId,
  streakDays,
  analysis = true,
}: MemberMonthViewProps) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const showPay = data.showPay;
  const daysWithHours = [...data.days]
    .filter((d) => (d.hours ?? 0) > 0 || d.flag)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const monthLabel = formatMonthName(month, locale);
  const openDay = (date: IsoDate) =>
    router.push({ pathname: '/day/[membershipId]/[date]', params: { membershipId, date } });
  const planned = data.plannedHours ?? 0;
  const subtitleFor = (day: MemberMonthDay): string => {
    const places = day.jobs.map((j) => j.location?.name).filter(Boolean);
    if (day.jobs.length > 1) return [t('jobs.jobCount', { count: day.jobs.length }), ...places].join(', ');
    if (places.length > 0 && !day.flag) return places.join(', ');
    if (day.flag?.status === 'OPEN')
      return (
        t('flags.says', { name: data.name }) +
        (day.flag.suggestedHours != null ? ` ${formatHours(day.flag.suggestedHours, locale)}` : '')
      );
    if (day.changeCount > 1 && day.note)
      return t('entry.changedFromWithNote', { hours: '', note: day.note }).replace(' ,', '');
    if (day.note) return `"${day.note}"`;
    if (day.updatedBy && day.updatedAt)
      return t('entry.loggedItAt', {
        name: day.updatedBy.name,
        time: formatTime(day.updatedAt.toISOString(), locale, timezone),
      });
    return '';
  };

  return (
    <>
      <View style={s.nav}>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t('month.previousMonth')}
          onPress={() => onChangeMonth(previousMonth(month))}
          style={s.navButton}
          testID="month-prev"
        >
          <Icon name="chevron-left" size={22} />
        </AppPressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          {headerTitle ?? (
            <AppText variant="small" tone="muted">
              {current
                ? t('month.soFar', { month: formatMonth(month, locale, { capitalize: true }) })
                : formatMonth(month, locale, { capitalize: true })}
            </AppText>
          )}
        </View>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t('month.nextMonth')}
          onPress={() => onChangeMonth(addMonths(month, 1))}
          style={s.navButton}
          testID="month-next"
        >
          <Icon name="chevron-right" size={22} />
        </AppPressable>
      </View>
      <Numeral
        value={formatHours(data.totalHours, locale, { unit: false })}
        unit={t('common.hourUnit')}
        variant="displayXl"
        accessibilityLabel={
          t('month.hoursIn', { month: monthLabel }) + `, ${formatHours(data.totalHours, locale)}`
        }
        testID="month-total"
      />
      {data.locked ? (
        <Card style={{ backgroundColor: theme.color.warningSoft }} testID="month-locked">
          <AppText variant="small" color={theme.color.warning}>
            {t('jobs.monthClosed', { month: monthLabel })}
          </AppText>
        </Card>
      ) : null}
      <View style={s.pills}>
        {planned > 0 ? (
          <Pill
            label={t('jobs.soFarPlanned', {
              hours: formatHours(data.totalHours - planned, locale),
              planned: formatHours(planned, locale),
            })}
            tone="accent"
            testID="month-planned"
          />
        ) : null}
        {analysis ? (
          <Pill
            label={t('month.avgPerWorkingDayShort', { hours: formatHours(data.avgPerWorkingDay, locale) })}
          />
        ) : null}
        {analysis ? (
          <Pill
            label={t('month.vsLastMonth', {
              delta: formatHoursDelta(data.vsLastMonthHours, locale),
              month: formatMonthName(previousMonth(month), locale, false),
            })}
            tone={data.vsLastMonthHours >= 0 ? 'success' : 'warning'}
            icon={data.vsLastMonthHours >= 0 ? 'trending-up' : 'trending-down'}
          />
        ) : null}
        {data.locked ? <Pill label={t('status.monthClosed')} icon="lock" /> : null}
        {analysis && streakDays != null && streakDays > 1 ? (
          <Pill label={t('insights.streakDays', { count: streakDays })} tone="accent" />
        ) : null}
      </View>
      <View style={s.tiles}>
        {showPay && data.earnings != null ? (
          <Card style={s.tile}>
            <AppText variant="small" tone="muted">
              {t('month.earnings')}
            </AppText>
            <Numeral value={formatMoney(data.earnings, currency, locale)} variant="h2" />
            {data.hourlyRate != null ? (
              <AppText variant="caption" tone="muted">
                {t('month.ratePerHour', { rate: formatMoney(data.hourlyRate, currency, locale) })}
              </AppText>
            ) : null}
          </Card>
        ) : null}
        {analysis ? (
          <Card style={s.tile} testID="month-best-week">
            <AppText variant="small" tone="muted">
              {t('month.bestWeek')}
            </AppText>
            <Numeral
              value={formatHours(data.bestWeek?.hours ?? 0, locale, { unit: false })}
              unit={t('common.hourUnit')}
              variant="h2"
            />
            {data.bestWeek ? (
              <AppText variant="caption" tone="muted">
                {t('month.weekLabel', { week: data.bestWeek.isoWeek })}
              </AppText>
            ) : null}
          </Card>
        ) : null}
      </View>
      <Card>
        <HeatMapCalendar
          month={month}
          weekStart={weekStart}
          days={data.days}
          today={today}
          onPressDay={openDay}
          accessibilityLabel={t('month.calendarLabel', { month: monthLabel })}
        />
        <View style={[s.legend, { marginTop: theme.space[3] }]}>
          <AppText variant="caption" tone="muted">
            {t('month.less')}
          </AppText>
          {heatFills(theme)
            .slice(1)
            .map((fill) => (
              <View key={fill} style={[s.swatch, { backgroundColor: fill }]} />
            ))}
          <AppText variant="caption" tone="muted">
            {t('month.more')}
          </AppText>
          <View style={[s.swatch, { backgroundColor: flagFill(theme), marginLeft: theme.space[2] }]} />
          <AppText variant="caption" tone="muted">
            {t('month.flag')}
          </AppText>
          <View style={[s.swatch, s.plannedSwatch, { marginLeft: theme.space[2] }]} />
          <AppText variant="caption" tone="muted">
            {t('jobs.planned')}
          </AppText>
        </View>
      </Card>
      {actions}
      <View>
        <AppText variant="eyebrow" tone="accent">
          {analysis ? t('month.daysNewestFirst', { count: daysWithHours.length }) : t('jobs.jobsThisMonth')}
        </AppText>
        {daysWithHours.map((day, i) => {
          const iso = toIsoDate(day.date);
          return (
            <View key={iso}>
              <AppPressable
                accessibilityRole="button"
                accessibilityLabel={formatDate(iso, locale, 'weekdayDayMonth')}
                onPress={() => openDay(iso)}
                pressScale={0.99}
                style={s.dayRow}
                testID={`month-day-${iso}`}
              >
                <View style={s.dayLabel}>
                  <AppText variant="eyebrow" tone="muted">
                    {formatDate(iso, locale, 'weekdayDay').split(' ')[0]}
                  </AppText>
                  <AppText variant="lead" weight={700} tabular>
                    {formatDate(iso, locale, 'day')}
                  </AppText>
                </View>
                <View style={s.dayBody}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
                    <AppText weight={700} tabular>
                      {formatHours(day.hours ?? 0, locale)}
                    </AppText>
                    {day.flag?.status === 'OPEN' ? (
                      <Pill label={t('month.flag')} tone="danger" icon="flag" />
                    ) : null}
                  </View>
                  <AppText variant="small" tone="muted" numberOfLines={1}>
                    {subtitleFor(day)}
                  </AppText>
                </View>
                {showPay && day.earnings != null ? (
                  <AppText variant="small" tabular>
                    {formatMoney(day.earnings, currency, locale)}
                  </AppText>
                ) : null}
                <Icon name="chevron-right" size={18} color={theme.color.textMuted} />
              </AppPressable>
              {i < daysWithHours.length - 1 ? <View style={s.sep} /> : null}
            </View>
          );
        })}
      </View>
    </>
  );
}

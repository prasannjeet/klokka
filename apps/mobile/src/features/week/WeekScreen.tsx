import { useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import type { Entry, Member } from '@klokka/api-client';
import {
  addDays,
  formatDate,
  formatHours,
  formatHoursDelta,
  isoWeek,
  sumHours,
  weekOf,
  type IsoDate,
} from '@klokka/core';
import { sameDate, useEntries, useMembers, useWorkspace } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { todayIn } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Avatar, Card, Header, Icon, Pill, Screen } from '@/ui';
import { withWorkspace, type WorkspaceProps } from '@/features/shell/withWorkspace';
import { AddHoursSheet, type AddHoursSheetHandle } from '@/features/entry/AddHoursSheet';

const styles = (t: Theme) =>
  StyleSheet.create({
    nav: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
    navButton: {
      width: t.tapMin,
      height: t.tapMin,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radius.pill,
      backgroundColor: t.color.surface2,
    },
    people: { flexDirection: 'row', gap: t.space[2], paddingVertical: t.space[1] },
    person: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[2],
      paddingRight: t.space[3],
      paddingLeft: t.space[1],
      height: t.tapMin,
      borderRadius: t.radius.pill,
      backgroundColor: t.color.surface2,
      borderWidth: 1,
      borderColor: t.color.border,
    },
    personOn: { backgroundColor: t.color.primary, borderColor: t.color.primary },
    page: { paddingRight: t.space[4] },
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

function entryFor(entries: Entry[] | undefined, membershipId: string, date: IsoDate): Entry | undefined {
  return entries?.find((e) => e.membershipId === membershipId && sameDate(e.workDate, date));
}

// The week (CHQ-118): one person per page, swipe sideways for the next; tap a day to change it. The
// employee sees only their own page. Totals here are sums of the visible entries (presentation).
function WeekScreenInner({ workspace }: WorkspaceProps) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const employer = workspace.role === 'EMPLOYER';
  const today = todayIn(workspace.timezone);
  const [anchor, setAnchor] = useState<IsoDate>(today);
  const week = useMemo(() => weekOf(anchor, workspace.weekStart), [anchor, workspace.weekStart]);
  const first = week[0] as IsoDate;
  const last = week[6] as IsoDate;
  const previousWeek = useMemo(
    () => weekOf(addDays(first, -7), workspace.weekStart),
    [first, workspace.weekStart],
  );
  const members = useMembers(workspace.workspaceId);
  const settings = useWorkspace(workspace.workspaceId);
  const people: Member[] = useMemo(
    () =>
      (members.data ?? []).filter(
        (m) =>
          m.role === 'EMPLOYEE' &&
          m.status !== 'DEACTIVATED' &&
          (employer || m.id === workspace.membershipId),
      ),
    [employer, members.data, workspace.membershipId],
  );
  const range = useEntries(
    workspace.workspaceId,
    addDays(first, -7),
    last,
    employer ? undefined : workspace.membershipId,
  );
  const [pageIndex, setPageIndex] = useState(0);
  const list = useRef<FlatList<Member>>(null);
  const sheet = useRef<AddHoursSheetHandle>(null);
  const pageWidth = width - theme.space[4] * 2;

  const openDay = (member: Member, date: IsoDate) => {
    if (!employer) {
      router.push({ pathname: '/day/[membershipId]/[date]', params: { membershipId: member.id, date } });
      return;
    }
    const existing = entryFor(range.data, member.id, date) ?? null;
    const yesterday = entryFor(range.data, member.id, addDays(date, -1));
    sheet.current?.open({
      membershipId: member.id,
      memberName: member.displayName,
      date,
      existing,
      yesterdayHours: yesterday?.hours ?? null,
      rounding: settings.data?.rounding ?? 'NONE',
      defaultDayHours: settings.data?.defaultDayHours ?? 8,
    });
  };

  const isoWeekNumber = isoWeek(first).week;

  return (
    <>
      <Screen refreshing={range.isRefetching} onRefresh={() => void range.refetch()} testID="week-screen">
        <Header
          title={t('week.title', { week: isoWeekNumber })}
          subtitle={t('week.range', {
            from: formatDate(first, locale, 'dayMonth'),
            to: formatDate(last, locale, 'dayMonth'),
          })}
          trailing={
            <View style={s.nav}>
              <AppPressable
                accessibilityRole="button"
                accessibilityLabel={t('week.previousWeek')}
                onPress={() => setAnchor(addDays(anchor, -7))}
                style={s.navButton}
                testID="week-prev"
              >
                <Icon name="chevron-left" size={22} />
              </AppPressable>
              <AppPressable
                accessibilityRole="button"
                accessibilityLabel={t('week.nextWeek')}
                onPress={() => setAnchor(addDays(anchor, 7))}
                style={s.navButton}
                testID="week-next"
              >
                <Icon name="chevron-right" size={22} />
              </AppPressable>
            </View>
          }
        />
        {anchor !== today ? (
          <AppPressable
            onPress={() => setAnchor(today)}
            accessibilityRole="button"
            accessibilityLabel={t('week.thisWeek')}
            style={{ alignSelf: 'flex-start' }}
          >
            <Pill label={t('week.thisWeek')} tone="accent" icon="refresh" />
          </AppPressable>
        ) : null}
        {employer && people.length > 1 ? (
          <FlatList
            horizontal
            data={people}
            keyExtractor={(m) => m.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.people}
            accessibilityLabel={t('mobile.week.personPager')}
            renderItem={({ item, index }) => (
              <AppPressable
                accessibilityRole="tab"
                accessibilityState={{ selected: index === pageIndex }}
                accessibilityLabel={item.displayName}
                onPress={() => {
                  setPageIndex(index);
                  list.current?.scrollToIndex({ index, animated: true });
                }}
                hapticKind="tick"
                style={[s.person, index === pageIndex ? s.personOn : null]}
              >
                <Avatar name={item.displayName} emoji={item.avatarEmoji} colour="PURPLE" size={28} />
                <AppText
                  variant="small"
                  weight={600}
                  color={index === pageIndex ? theme.color.onPrimary : theme.color.text}
                >
                  {item.displayName.split(' ')[0]}
                </AppText>
              </AppPressable>
            )}
          />
        ) : null}
        <FlatList
          ref={list}
          horizontal
          pagingEnabled
          data={people}
          keyExtractor={(m) => m.id}
          showsHorizontalScrollIndicator={false}
          snapToInterval={pageWidth}
          decelerationRate="fast"
          getItemLayout={(_d, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
          onMomentumScrollEnd={(e) => setPageIndex(Math.round(e.nativeEvent.contentOffset.x / pageWidth))}
          style={{ marginHorizontal: -theme.space[4] }}
          contentContainerStyle={{ paddingHorizontal: theme.space[4] }}
          renderItem={({ item: member }) => {
            const weekEntries = week.map((d) => entryFor(range.data, member.id, d));
            const total = sumHours(weekEntries.map((e) => e?.hours ?? 0));
            const lastTotal = sumHours(
              previousWeek.map((d) => entryFor(range.data, member.id, d)?.hours ?? 0),
            );
            return (
              <View style={{ width: pageWidth }} testID={`week-page-${member.id}`}>
                <Card style={{ marginRight: theme.space[2] }}>
                  <View style={s.pageHeader}>
                    <Avatar name={member.displayName} emoji={member.avatarEmoji} colour="PURPLE" size={32} />
                    <AppText variant="lead" weight={700} style={{ flex: 1 }} numberOfLines={1}>
                      {member.displayName}
                    </AppText>
                    {lastTotal > 0 || total > 0 ? (
                      <Pill
                        label={t('week.vsLastWeek', { delta: formatHoursDelta(total - lastTotal, locale) })}
                        tone={total >= lastTotal ? 'success' : 'warning'}
                        icon={total >= lastTotal ? 'trending-up' : 'trending-down'}
                      />
                    ) : null}
                  </View>
                  {week.map((date, i) => {
                    const entry = weekEntries[i];
                    const isToday = date === today;
                    const subtitle = entry?.note
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
                          onPress={() => openDay(member, date)}
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
                        {i < 6 ? <View style={s.sep} /> : null}
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
              </View>
            );
          }}
        />
        <AppText variant="caption" tone="muted" align="center">
          {employer ? t('week.swipeHint') : t('month.notesVisibleHint')}
        </AppText>
      </Screen>
      {employer ? <AddHoursSheet ref={sheet} workspace={workspace} /> : null}
    </>
  );
}

export const WeekScreen = withWorkspace(WeekScreenInner);

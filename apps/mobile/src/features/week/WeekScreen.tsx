import { useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import type { Member } from '@klokka/api-client';
import { addDays, formatDate, isoWeek, weekOf, type IsoDate } from '@klokka/core';
import { useEntries, useMembers, useWorkspace } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { todayIn } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Avatar, Header, Icon, Pill, Screen } from '@/ui';
import { withWorkspace, type WorkspaceProps } from '@/features/shell/withWorkspace';
import { JobSheet, type JobSheetHandle } from '@/features/jobs/JobSheet';
import { dayActionFor } from '@/features/jobs/dayAction';
import { WeekCard, entryFor } from './WeekCard';

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
      height: 40,
      borderRadius: t.radius.control,
      backgroundColor: t.color.surface,
      borderWidth: 1,
      borderColor: t.color.border,
    },
    personOn: { backgroundColor: t.color.secondary, borderColor: t.color.secondary },
    page: { paddingRight: t.space[4] },
  });

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
  const sheet = useRef<JobSheetHandle>(null);
  const pageWidth = width - theme.space[4] * 2;

  const openDay = (member: Member, date: IsoDate) => {
    if (!employer) {
      router.push({ pathname: '/day/[membershipId]/[date]', params: { membershipId: member.id, date } });
      return;
    }
    const action = dayActionFor(entryFor(range.data, member.id, date));
    if (action.kind === 'day') {
      router.push({ pathname: '/day/[membershipId]/[date]', params: { membershipId: member.id, date } });
      return;
    }
    const yesterday = entryFor(range.data, member.id, addDays(date, -1));
    sheet.current?.open({
      membershipId: member.id,
      memberName: member.displayName,
      date,
      job: action.job,
      dayHours: action.dayHours,
      yesterdayHours: yesterday?.hours ?? null,
      rounding: settings.data?.rounding ?? 'NONE',
      defaultDayHours: settings.data?.defaultDayHours ?? 8,
    });
  };

  const isoWeekNumber = isoWeek(first).week;

  return (
    <>
      <Screen onRefresh={() => range.refetch()} testID="week-screen">
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
                hitSlop={(theme.tapMin - 40) / 2}
                style={[s.person, index === pageIndex ? s.personOn : null]}
              >
                <Avatar
                  name={item.displayName}
                  emoji={item.avatarEmoji}
                  colour={index === pageIndex ? 'INK' : 'PURPLE'}
                  size={28}
                />
                <AppText
                  variant="small"
                  weight={600}
                  color={index === pageIndex ? theme.color.onSecondary : theme.color.text}
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
          renderItem={({ item: member }) => (
            <View
              style={{ width: pageWidth, paddingRight: theme.space[2] }}
              testID={`week-page-${member.id}`}
            >
              <WeekCard
                member={member}
                week={week}
                previousWeek={previousWeek}
                entries={range.data}
                today={today}
                employer={employer}
                onOpenDay={(date) => openDay(member, date)}
              />
            </View>
          )}
        />
        <AppText variant="caption" tone="muted" align="center">
          {employer ? t('week.swipeHint') : t('month.notesVisibleHint')}
        </AppText>
      </Screen>
      {employer ? <JobSheet ref={sheet} workspace={workspace} /> : null}
    </>
  );
}

export const WeekScreen = withWorkspace(WeekScreenInner);

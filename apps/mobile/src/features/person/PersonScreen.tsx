import { useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  addDays,
  formatDate,
  formatMonthName,
  isoWeek,
  monthOf,
  weekOf,
  type IsoDate,
  type IsoMonth,
} from '@klokka/core';
import { useEntries, useMember, useMemberMonth, useWorkspace } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { currentMonthIn, todayIn } from '@/lib/dates';
import { useThemedStyles, type Theme } from '@/theme';
import {
  AppPressable,
  AppText,
  Avatar,
  EmptyState,
  Header,
  Icon,
  Pill,
  Screen,
  Segmented,
  type SegmentedOption,
} from '@/ui';
import { withWorkspace, type WorkspaceProps } from '@/features/shell/withWorkspace';
import { DayPage } from '@/features/day/DayScreen';
import { JobSheet, type JobSheetHandle } from '@/features/jobs/JobSheet';
import { dayActionFor } from '@/features/jobs/dayAction';
import { MemberMonthView } from '@/features/month/MemberMonthView';
import { MemberActionsSheets, type MemberActionsHandle } from '@/features/member/MemberActionsSheets';
import { MonthLockExport } from '@/features/member/MonthLockExport';
import { WeekCard, entryFor } from '@/features/week/WeekCard';

export type PersonView = 'day' | 'week' | 'month';

export function personViewOf(value: unknown): PersonView | null {
  return value === 'day' || value === 'week' || value === 'month' ? value : null;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    round: {
      width: t.tapMin,
      height: t.tapMin,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radius.pill,
      backgroundColor: t.color.surface2,
    },
    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.space[2] },
    navText: { flex: 1, alignItems: 'center', gap: 2 },
  });

type Workspace = WorkspaceProps['workspace'];

// One person (CHQ-171, the People tab): their week, day or month behind one switch, each with its own arrows.
// The date carries over between the views, so a week's Wednesday opens as that day and that month. Replaces
// the per-employee month (CHQ-122); the lock, export and member actions stay here.
function PersonScreenInner({
  membershipId,
  initialView,
  initialMonth,
  initialDate,
  workspace,
}: {
  membershipId: string;
  initialView: PersonView;
  // A month to open on (a notification about a closed month); its first day, or today in the current month.
  initialMonth?: IsoMonth | undefined;
  // A date to open on (a person's chip on the team day).
  initialDate?: IsoDate | undefined;
} & WorkspaceProps) {
  const t = useT();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const today = todayIn(workspace.timezone);
  const [view, setView] = useState<PersonView>(initialView);
  const [date, setDate] = useState<IsoDate>(
    initialDate ?? (initialMonth && initialMonth !== monthOf(today) ? `${initialMonth}-01` : today),
  );
  const member = useMember(workspace.workspaceId, membershipId);
  const actions = useRef<MemberActionsHandle>(null);
  const name = member.data?.displayName ?? '';
  const status = member.data?.status;
  const views: SegmentedOption<PersonView>[] = [
    { value: 'day', label: t('team.day'), testID: 'view-day' },
    { value: 'week', label: t('team.week'), testID: 'view-week' },
    { value: 'month', label: t('team.month'), testID: 'view-month' },
  ];
  const openDay = (next: IsoDate) => {
    setDate(next);
    setView('day');
  };
  const header = (
    <>
      <Header
        title={name}
        back
        large={false}
        leading={<Avatar name={name} emoji={member.data?.avatarEmoji} colour="PURPLE" size={36} />}
        trailing={
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel={t('common.manage')}
            onPress={() => actions.current?.present()}
            style={s.round}
            testID="member-actions"
          >
            <Icon name="more" size={22} />
          </AppPressable>
        }
      />
      {status === 'INVITED' ? (
        <Pill label={t('status.invited')} tone="warning" />
      ) : status === 'DEACTIVATED' ? (
        <Pill label={t('status.deactivated')} />
      ) : null}
      <Segmented options={views} value={view} onChange={setView} accessibilityLabel={t('team.view')} />
    </>
  );

  return (
    <>
      {view === 'day' ? (
        <DayPage
          membershipId={membershipId}
          date={date}
          workspace={workspace}
          header={() => header}
          onStep={setDate}
        />
      ) : view === 'week' ? (
        <PersonWeek
          membershipId={membershipId}
          name={name}
          date={date}
          onDate={setDate}
          onOpenDay={openDay}
          workspace={workspace}
          header={header}
        />
      ) : (
        <PersonMonth
          membershipId={membershipId}
          name={name}
          month={monthOf(date)}
          onMonth={(m) => setDate(m === monthOf(today) ? today : `${m}-01`)}
          onOpenDay={openDay}
          workspace={workspace}
          header={header}
        />
      )}
      <MemberActionsSheets
        ref={actions}
        workspace={workspace}
        member={member.data}
        membershipId={membershipId}
        onRemoved={() => router.back()}
      />
    </>
  );
}

function PersonWeek({
  membershipId,
  name,
  date,
  onDate,
  onOpenDay,
  workspace,
  header,
}: {
  membershipId: string;
  name: string;
  date: IsoDate;
  onDate: (date: IsoDate) => void;
  onOpenDay: (date: IsoDate) => void;
  workspace: Workspace;
  header: ReactNode;
}) {
  const t = useT();
  const locale = useLocale();
  const s = useThemedStyles(styles);
  const today = todayIn(workspace.timezone);
  const week = useMemo(() => weekOf(date, workspace.weekStart), [date, workspace.weekStart]);
  const first = week[0] as IsoDate;
  const last = week[6] as IsoDate;
  const previousWeek = useMemo(
    () => weekOf(addDays(first, -7), workspace.weekStart),
    [first, workspace.weekStart],
  );
  const range = useEntries(workspace.workspaceId, addDays(first, -7), last, membershipId);
  const settings = useWorkspace(workspace.workspaceId);
  const sheet = useRef<JobSheetHandle>(null);
  const employer = workspace.role === 'EMPLOYER';

  // A day with one job or none opens the job sheet right here; a day with several opens the Day view.
  const openDay = (day: IsoDate) => {
    const action = dayActionFor(entryFor(range.data, membershipId, day));
    if (!employer || action.kind === 'day') {
      onOpenDay(day);
      return;
    }
    sheet.current?.open({
      membershipId,
      memberName: name,
      date: day,
      job: action.job,
      dayHours: action.dayHours,
      yesterdayHours: entryFor(range.data, membershipId, addDays(day, -1))?.hours ?? null,
      rounding: settings.data?.rounding ?? workspace.rounding,
      defaultDayHours: settings.data?.defaultDayHours ?? workspace.defaultDayHours,
    });
  };

  return (
    <>
      <Screen onRefresh={() => range.refetch()} testID="person-week">
        {header}
        <View style={s.nav}>
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel={t('week.previousWeek')}
            onPress={() => onDate(addDays(date, -7))}
            style={s.round}
            testID="week-prev"
          >
            <Icon name="chevron-left" size={22} />
          </AppPressable>
          <View style={s.navText}>
            <AppText variant="eyebrow" tone="accent">
              {t('week.range', {
                from: formatDate(first, locale, 'dayMonth'),
                to: formatDate(last, locale, 'dayMonth'),
              })}
            </AppText>
            <AppText variant="h2" align="center">
              {t('week.title', { week: isoWeek(first).week })}
            </AppText>
          </View>
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel={t('week.nextWeek')}
            onPress={() => onDate(addDays(date, 7))}
            style={s.round}
            testID="week-next"
          >
            <Icon name="chevron-right" size={22} />
          </AppPressable>
        </View>
        <WeekCard
          member={{ id: membershipId, displayName: name, avatarEmoji: null }}
          week={week}
          previousWeek={previousWeek}
          entries={range.data}
          today={today}
          employer={employer}
          onOpenDay={openDay}
          showName={false}
        />
      </Screen>
      {employer ? <JobSheet ref={sheet} workspace={workspace} /> : null}
    </>
  );
}

function PersonMonth({
  membershipId,
  name,
  month,
  onMonth,
  onOpenDay,
  workspace,
  header,
}: {
  membershipId: string;
  name: string;
  month: IsoMonth;
  onMonth: (month: IsoMonth) => void;
  onOpenDay: (date: IsoDate) => void;
  workspace: Workspace;
  header: ReactNode;
}) {
  const t = useT();
  const locale = useLocale();
  const current = currentMonthIn(workspace.timezone);
  const data = useMemberMonth(workspace.workspaceId, membershipId, month);
  return (
    <Screen onRefresh={() => data.refetch()} testID="member-month-screen">
      {header}
      {data.isError ? (
        <EmptyState
          icon="alert"
          title={t('errors.NETWORK')}
          actionLabel={t('common.retry')}
          onAction={() => void data.refetch()}
        />
      ) : null}
      {data.data ? (
        <MemberMonthView
          data={data.data}
          month={month}
          weekStart={workspace.weekStart}
          currency={workspace.currency}
          today={todayIn(workspace.timezone)}
          timezone={workspace.timezone}
          onChangeMonth={onMonth}
          onOpenDay={onOpenDay}
          current={month === current}
          membershipId={membershipId}
          headerTitle={
            <AppText variant="small" tone="muted">
              {t('month.title', {
                name: name.split(' ')[0] ?? name,
                month: formatMonthName(month, locale),
              })}
            </AppText>
          }
          actions={
            <MonthLockExport
              workspace={workspace}
              month={month}
              locked={data.data.locked}
              membershipId={membershipId}
              totalHours={data.data.totalHours}
            />
          }
        />
      ) : null}
    </Screen>
  );
}

export const PersonScreen = withWorkspace(PersonScreenInner);

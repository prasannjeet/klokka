import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { formatMonth, formatMonthName, type IsoMonth } from '@klokka/core';
import { useWorkspaceOrThrow } from '@/data/me';
import { useMember, useMemberMonth } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { currentMonthIn, todayIn } from '@/lib/dates';
import { useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Avatar, EmptyState, Header, Icon, Pill, Screen } from '@/ui';
import { withWorkspace } from '@/features/shell/withWorkspace';
import { MemberMonthView } from '@/features/month/MemberMonthView';
import { MemberActionsSheets, type MemberActionsHandle } from './MemberActionsSheets';
import { MonthLockExport } from './MonthLockExport';

const styles = (t: Theme) =>
  StyleSheet.create({
    more: {
      width: t.tapMin,
      height: t.tapMin,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radius.pill,
      backgroundColor: t.color.surface2,
    },
  });

// The employer's per-employee month (CHQ-122): the same calendar the employee sees, with the lock
// and export (CHQ-120) under it and the member actions (CHQ-116) behind the menu.
function MemberMonthScreenInner({
  membershipId,
  initialMonth,
}: {
  membershipId: string;
  initialMonth?: IsoMonth | undefined;
}) {
  const t = useT();
  const locale = useLocale();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const workspace = useWorkspaceOrThrow();
  const current = currentMonthIn(workspace.timezone);
  const [month, setMonth] = useState<IsoMonth>(initialMonth ?? current);
  const data = useMemberMonth(workspace.workspaceId, membershipId, month);
  const member = useMember(workspace.workspaceId, membershipId, month);
  const actions = useRef<MemberActionsHandle>(null);
  const name = member.data?.displayName ?? data.data?.name ?? '';
  const status = member.data?.status;
  const monthName = formatMonthName(month, locale);

  return (
    <>
      <Screen
        refreshing={data.isRefetching}
        onRefresh={() => void data.refetch()}
        testID="member-month-screen"
      >
        <Header
          title={name}
          subtitle={formatMonth(month, locale, { capitalize: true })}
          back
          large={false}
          leading={<Avatar name={name} emoji={member.data?.avatarEmoji} colour="PURPLE" size={36} />}
          trailing={
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={t('common.manage')}
              onPress={() => actions.current?.present()}
              style={s.more}
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
            onChangeMonth={setMonth}
            current={month === current}
            membershipId={membershipId}
            headerTitle={
              <AppText variant="small" tone="muted">
                {t('month.title', { name: name.split(' ')[0] ?? name, month: monthName })}
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

export const MemberMonthScreen = withWorkspace(MemberMonthScreenInner);

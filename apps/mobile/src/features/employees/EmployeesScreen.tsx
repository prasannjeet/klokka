import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Member } from '@klokka/api-client';
import { formatDate, formatHours, formatMonthName, formatRate } from '@klokka/core';
import { useMembers, useResendInvitation } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { currentMonthIn, toIsoDate } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import {
  AppPressable,
  AppText,
  Avatar,
  Button,
  Card,
  EmptyState,
  Header,
  Icon,
  Pill,
  PressableCard,
  Screen,
  useToast,
  type SheetHandle,
} from '@/ui';
import { withWorkspace, type WorkspaceProps } from '@/features/shell/withWorkspace';
import { AddEmployeeSheet } from './AddEmployeeSheet';

const styles = (t: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
    text: { flex: 1, minWidth: 0, gap: 2 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
    hours: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
    footer: { position: 'absolute', left: t.space[4], right: t.space[4] },
    hint: { flexDirection: 'row', gap: t.space[2], alignItems: 'flex-start' },
  });

function memberSubtitle(
  member: Member,
  showPay: boolean,
  currency: string,
  locale: 'sv' | 'en',
  t: ReturnType<typeof useT>,
): string {
  const joined = member.joinedAt ? formatDate(toIsoDate(member.joinedAt), locale, 'dayMonth') : null;
  if (member.status === 'INVITED') {
    return t('employees.invitationSent', {
      when: formatDate(toIsoDate(member.invitation?.sentAt ?? member.invitedAt), locale, 'dayMonth'),
    });
  }
  if (showPay && member.hourlyRate != null) {
    return joined
      ? t('employees.joinedIn', {
          rate: `${formatRate(member.hourlyRate, currency, locale)}/h`,
          when: joined,
        })
      : `${formatRate(member.hourlyRate, currency, locale)}/h`;
  }
  return joined ? t('mobile.employees.joined', { when: joined }) : '';
}

// Employees (CHQ-113, CHQ-116): month total per person, rate when pay is on, the invited state with
// a resend, and the add-employee sheet from the floating button.
function EmployeesScreenInner({ workspace }: WorkspaceProps) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const toast = useToast();
  const month = currentMonthIn(workspace.timezone);
  const members = useMembers(workspace.workspaceId, month);
  const resend = useResendInvitation(workspace.workspaceId);
  const sheet = useRef<SheetHandle>(null);
  const reduced = useReducedMotion();
  const list = (members.data ?? []).filter((m) => m.role === 'EMPLOYEE');

  const onResend = async (member: Member) => {
    try {
      await resend.mutateAsync(member.id);
      toast.show(t('employees.invitationResent', { email: member.email }));
    } catch {
      toast.show(t('errors.INTERNAL'), 'danger');
    }
  };

  return (
    <>
      <Screen
        bottomInset={72}
        refreshing={members.isRefetching}
        onRefresh={() => void members.refetch()}
        testID="employees-screen"
      >
        <Header
          title={t('employees.title')}
          subtitle={t('employees.subtitleShort', {
            people: t('common.people', { count: list.length }),
            month: formatMonthName(month, locale),
          })}
          back
        />
        {members.isError ? (
          <EmptyState
            icon="alert"
            title={t('errors.NETWORK')}
            actionLabel={t('common.retry')}
            onAction={() => void members.refetch()}
          />
        ) : null}
        {members.data && list.length === 0 ? (
          <EmptyState icon="users" title={t('employees.addEmployeeShortHint')} />
        ) : null}
        {list.map((member, i) => (
          <Animated.View
            key={member.id}
            entering={reduced ? undefined : FadeInUp.delay(i * 60).duration(theme.motion.duration.base)}
          >
            <PressableCard
              onPress={() =>
                router.push({ pathname: '/member/[membershipId]', params: { membershipId: member.id } })
              }
              accessibilityRole="button"
              accessibilityLabel={member.displayName}
              testID={`member-${member.id}`}
            >
              <View style={s.row}>
                <Avatar
                  name={member.displayName}
                  emoji={member.avatarEmoji}
                  colour={member.status === 'ACTIVE' ? 'PURPLE' : 'YELLOW'}
                  size={44}
                />
                <View style={s.text}>
                  <View style={s.nameRow}>
                    <AppText variant="lead" weight={700} numberOfLines={1} style={{ flexShrink: 1 }}>
                      {member.displayName}
                    </AppText>
                    {member.status === 'INVITED' ? <Pill label={t('status.invited')} tone="warning" /> : null}
                    {member.status === 'DEACTIVATED' ? <Pill label={t('status.deactivated')} /> : null}
                  </View>
                  <AppText variant="small" tone="muted" numberOfLines={2}>
                    {memberSubtitle(member, workspace.showPay, workspace.currency, locale, t)}
                  </AppText>
                  {member.status === 'INVITED' ? (
                    <AppPressable
                      onPress={() => void onResend(member)}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.resend')}
                      hapticKind="confirm"
                      style={{ alignSelf: 'flex-start' }}
                    >
                      <AppText variant="small" weight={600} tone="accent">
                        {t('common.resend')}
                      </AppText>
                    </AppPressable>
                  ) : null}
                </View>
                <View style={s.hours}>
                  <AppText variant="h2" tabular>
                    {formatHours(member.month.hours, locale, { unit: false })}
                  </AppText>
                  <AppText variant="small" weight={700} tone="muted">
                    {t('common.hourUnit')}
                  </AppText>
                </View>
                <Icon name="chevron-right" size={20} color={theme.color.textMuted} />
              </View>
            </PressableCard>
          </Animated.View>
        ))}
        {list.length > 0 ? (
          <Card tint>
            <View style={s.hint}>
              <Icon name="info" size={18} color={theme.color.accent} />
              <AppText variant="small" tone="muted" style={{ flex: 1 }}>
                {workspace.showPay ? t('employees.ratesShownHint') : t('employees.ratesHiddenHint')}
              </AppText>
            </View>
          </Card>
        ) : null}
      </Screen>
      <View style={[s.footer, { bottom: insets.bottom + theme.space[6] }]}>
        <Button
          label={t('employees.addEmployee')}
          icon="plus"
          onPress={() => sheet.current?.present()}
          testID="add-employee"
        />
      </View>
      <AddEmployeeSheet ref={sheet} workspace={workspace} />
    </>
  );
}

export const EmployeesScreen = withWorkspace(EmployeesScreenInner);

import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Rounding, WeekStart, WorkspaceColour } from '@klokka/api-client';
import { formatHours, stepHours } from '@klokka/core';
import { useWorkspaceOrThrow } from '@/data/me';
import { useUpdateWorkspace, useWorkspace } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { problemMessage } from '@/lib/problems';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import {
  AppPressable,
  AppSheet,
  AppSwitch,
  AppText,
  Avatar,
  Button,
  Card,
  Header,
  Icon,
  Numeral,
  Row,
  Screen,
  Separator,
  Stepper,
  TextField,
  useToast,
  type SheetHandle,
} from '@/ui';
import { withWorkspace } from '@/features/shell/withWorkspace';
import { OptionSheet } from '@/ui/OptionSheet';
import { AppPreferenceRows, NotificationPreferenceRows } from '@/features/profile/PreferenceRows';
import { WORKSPACE_COLOURS, WORKSPACE_EMOJIS } from '@/features/workspaces/CreateWorkspaceScreen';
import { useSignOut } from '@/features/shell/useSignOut';

const styles = (t: Theme) =>
  StyleSheet.create({
    ws: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
    section: { gap: t.space[1] },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
    swatch: {
      width: 36,
      height: 36,
      borderRadius: t.radius.pill,
      borderWidth: 3,
      borderColor: 'transparent',
    },
    swatchOn: { borderColor: t.color.text },
    emoji: {
      width: 40,
      height: 40,
      borderRadius: t.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.color.surface2,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    emojiOn: { borderColor: t.color.primary },
    stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  });

export function cityOf(timezone: string): string {
  const last = timezone.split('/').pop() ?? timezone;
  return last.replace(/_/g, ' ');
}

// Settings (CHQ-127): the pay switch is the first row; below it time, notifications, app, workspace
// and account. Every row saves as it changes.
function SettingsScreenInner() {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const toast = useToast();
  const active = useWorkspaceOrThrow();
  const workspace = useWorkspace(active.workspaceId);
  const update = useUpdateWorkspace(active.workspaceId);
  const signOut = useSignOut();
  const editSheet = useRef<SheetHandle>(null);
  const dayLengthSheet = useRef<SheetHandle>(null);
  const roundingSheet = useRef<SheetHandle>(null);
  const weekStartSheet = useRef<SheetHandle>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [colour, setColour] = useState<WorkspaceColour>('PRIMARY');
  const [dayLength, setDayLength] = useState(8);
  const ws = workspace.data;

  const save = async (patch: Parameters<typeof update.mutateAsync>[0], done?: () => void) => {
    try {
      await update.mutateAsync(patch);
      toast.show(t('mobile.settings.saved'));
      done?.();
    } catch (e) {
      toast.show(await problemMessage(e, t), 'danger');
    }
  };
  const roundingLabel = (r: Rounding) =>
    r === 'QUARTER'
      ? t('settings.roundingQuarter')
      : r === 'HALF'
        ? t('settings.roundingHalf')
        : t('settings.roundingNone');
  const weekStartLabel = (w: WeekStart) => (w === 'SUNDAY' ? t('workspace.sunday') : t('workspace.monday'));

  return (
    <>
      <Screen
        refreshing={workspace.isRefetching}
        onRefresh={() => void workspace.refetch()}
        testID="settings-screen"
      >
        <Header title={t('settings.title')} subtitle={active.name} />
        <Card>
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel={t('mobile.settings.editWorkspace')}
            onPress={() => {
              setName(ws?.name ?? active.name);
              setEmoji(ws?.emoji ?? active.emoji);
              setColour(ws?.colour ?? active.colour);
              editSheet.current?.present();
            }}
            testID="edit-workspace"
          >
            <View style={s.ws}>
              <Avatar
                name={active.name}
                emoji={ws?.emoji ?? active.emoji}
                colour={ws?.colour ?? active.colour}
                size={48}
                square
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="h3" numberOfLines={1}>
                  {ws?.name ?? active.name}
                </AppText>
                <AppText variant="small" tone="muted" numberOfLines={2}>
                  {t('workspace.summary', {
                    city: cityOf(ws?.timezone ?? active.timezone),
                    currency: ws?.currency ?? active.currency,
                    weekStart: weekStartLabel(ws?.weekStart ?? active.weekStart),
                  })}
                </AppText>
              </View>
              <Icon name="edit" size={20} color={theme.color.textMuted} />
            </View>
          </AppPressable>
        </Card>
        <Card>
          <AppText variant="eyebrow" tone="accent">
            {t('settings.pay')}
          </AppText>
          <Row
            title={t('settings.showPay')}
            subtitle={t('settings.showPayShortHint')}
            trailing={
              <AppSwitch
                value={ws?.showPay ?? active.showPay}
                onValueChange={(v) => void save({ showPay: v })}
                accessibilityLabel={t('settings.showPay')}
                testID="show-pay"
              />
            }
          />
        </Card>
        <Card>
          <AppText variant="eyebrow" tone="accent">
            {t('settings.time')}
          </AppText>
          <Row
            title={t('settings.fullDay')}
            subtitle={t('settings.fullDayChipHint')}
            value={formatHours(ws?.defaultDayHours ?? 8, locale)}
            onPress={() => {
              setDayLength(ws?.defaultDayHours ?? 8);
              dayLengthSheet.current?.present();
            }}
            testID="full-day"
          />
          <Separator />
          <Row
            title={t('settings.rounding')}
            value={roundingLabel(ws?.rounding ?? 'NONE')}
            onPress={() => roundingSheet.current?.present()}
            testID="rounding"
          />
          <Separator />
          <Row
            title={t('workspace.weekStart')}
            value={weekStartLabel(ws?.weekStart ?? active.weekStart)}
            onPress={() => weekStartSheet.current?.present()}
            testID="week-start"
          />
        </Card>
        <Card>
          <AppText variant="eyebrow" tone="accent">
            {t('settings.notifications')}
          </AppText>
          <NotificationPreferenceRows employer />
        </Card>
        <Card>
          <AppText variant="eyebrow" tone="accent">
            {t('settings.app')}
          </AppText>
          <AppPreferenceRows />
        </Card>
        <Card>
          <AppText variant="eyebrow" tone="accent">
            {t('settings.workspace')}
          </AppText>
          <Row
            title={t('employees.title')}
            icon="users"
            value={t('common.people', { count: ws?.activeMemberCount ?? active.memberCount ?? 0 })}
            onPress={() => router.push('/employees')}
            testID="settings-employees"
          />
          <Separator />
          <Row
            title={t('nav.switchWorkspace')}
            icon="swap"
            onPress={() => router.push('/choose-workspace')}
            testID="settings-switch"
          />
          <Separator />
          <Row
            title={t('nav.createWorkspace')}
            icon="plus"
            onPress={() => router.push('/create-workspace')}
          />
        </Card>
        <Card>
          <AppText variant="eyebrow" tone="accent">
            {t('mobile.settings.account')}
          </AppText>
          <Row
            title={t('common.signOut')}
            icon="log-out"
            onPress={() => void signOut()}
            chevron={false}
            testID="sign-out"
          />
        </Card>
        <AppText variant="caption" tone="muted" align="center">
          {t('settings.savesPerField')}
        </AppText>
      </Screen>
      <AppSheet
        ref={editSheet}
        title={t('mobile.settings.editWorkspace')}
        subtitle={t('settings.hint')}
        closeLabel={t('common.close')}
        testID="edit-workspace-sheet"
      >
        <View style={{ gap: theme.space[4] }}>
          <TextField
            label={t('workspace.name')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            testID="workspace-name"
          />
          <View style={s.section}>
            <AppText variant="small" weight={600}>
              {t('workspace.emoji')}
            </AppText>
            <View style={s.wrap}>
              {WORKSPACE_EMOJIS.map((e) => (
                <AppPressable
                  key={e}
                  accessibilityRole="button"
                  accessibilityLabel={e}
                  accessibilityState={{ selected: e === emoji }}
                  onPress={() => setEmoji(e)}
                  hapticKind="tick"
                  style={[s.emoji, e === emoji ? s.emojiOn : null]}
                >
                  <AppText style={{ fontSize: 20, lineHeight: 28 }}>{e}</AppText>
                </AppPressable>
              ))}
            </View>
          </View>
          <View style={s.section}>
            <AppText variant="small" weight={600}>
              {t('workspace.colour')}
            </AppText>
            <View style={s.wrap}>
              {WORKSPACE_COLOURS.map((c) => (
                <AppPressable
                  key={c}
                  accessibilityRole="button"
                  accessibilityLabel={c}
                  accessibilityState={{ selected: c === colour }}
                  onPress={() => setColour(c)}
                  hapticKind="tick"
                  style={[
                    s.swatch,
                    { backgroundColor: theme.workspace(c).fill },
                    c === colour ? s.swatchOn : null,
                  ]}
                />
              ))}
            </View>
          </View>
          <Button
            label={t('common.save')}
            disabled={name.trim().length < 2}
            loading={update.isPending}
            onPress={() =>
              void save({ name: name.trim(), emoji, colour }, () => editSheet.current?.dismiss())
            }
            testID="workspace-save"
          />
        </View>
      </AppSheet>
      <AppSheet
        ref={dayLengthSheet}
        title={t('settings.defaultDayLength')}
        subtitle={t('settings.defaultDayLengthHint')}
        closeLabel={t('common.close')}
        testID="day-length-sheet"
      >
        <View style={{ gap: theme.space[4] }}>
          <View style={s.stepRow}>
            <Numeral
              value={formatHours(dayLength, locale, { unit: false })}
              unit={t('common.hourUnit')}
              variant="displayL"
              accessibilityLabel={t('settings.defaultDayLengthLabel')}
            />
            <Stepper
              onDecrement={() => setDayLength((h) => stepHours(h, -1))}
              onIncrement={() => setDayLength((h) => stepHours(h, 1))}
              decrementLabel={t('entry.halfHourLess')}
              incrementLabel={t('entry.halfHourMore')}
              canDecrement={dayLength > 0.5}
              canIncrement={dayLength < 24}
            />
          </View>
          <Button
            label={t('common.save')}
            loading={update.isPending}
            onPress={() => void save({ defaultDayHours: dayLength }, () => dayLengthSheet.current?.dismiss())}
            testID="day-length-save"
          />
        </View>
      </AppSheet>
      <OptionSheet<Rounding>
        ref={roundingSheet}
        title={t('settings.roundingRule')}
        subtitle={t('settings.roundingHint')}
        closeLabel={t('common.close')}
        value={ws?.rounding ?? 'NONE'}
        options={[
          { value: 'NONE', label: t('settings.roundingNone') },
          { value: 'QUARTER', label: t('settings.roundingQuarter') },
          { value: 'HALF', label: t('settings.roundingHalf') },
        ]}
        onChange={(rounding) => void save({ rounding })}
        testID="rounding-sheet"
      />
      <OptionSheet<WeekStart>
        ref={weekStartSheet}
        title={t('workspace.weekStartsOn')}
        subtitle={t('workspace.timezoneHint')}
        closeLabel={t('common.close')}
        value={ws?.weekStart ?? active.weekStart}
        options={[
          { value: 'MONDAY', label: t('workspace.monday') },
          { value: 'SUNDAY', label: t('workspace.sunday') },
        ]}
        onChange={(weekStart) => void save({ weekStart })}
        testID="week-start-sheet"
      />
    </>
  );
}

export const SettingsScreen = withWorkspace(SettingsScreenInner);

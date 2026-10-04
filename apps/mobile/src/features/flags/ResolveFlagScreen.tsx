import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { formatDate, formatHours, formatTime, parseHours } from '@klokka/core';
import { useEntries, useEntryHistory, useFlag, useResolveFlag } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { problemMessage } from '@/lib/problems';
import { toIsoDate } from '@/lib/dates';
import { useThemedStyles, type Theme } from '@/theme';
import {
  AppText,
  Avatar,
  Button,
  Card,
  EmptyState,
  Header,
  Numeral,
  Pill,
  Screen,
  TextField,
  haptic,
  useToast,
} from '@/ui';
import { withWorkspace, type WorkspaceProps } from '@/features/shell/withWorkspace';
import { HistoryList } from '@/features/day/HistoryList';

const styles = (t: Theme) =>
  StyleSheet.create({
    tiles: { flexDirection: 'row', gap: t.space[3] },
    tile: { flex: 1, gap: 2 },
    quote: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], marginBottom: t.space[2] },
    actions: { gap: t.space[2] },
  });

// Resolve a flag (CHQ-135, employer): the two numbers face each other; the fix is an editable hours field
// pre-filled with what the employee says, or with the logged hours when they suggested none (CHQ-145, like
// the web: 0 h is only ever written when the employer typed it). Keeping the entry dismisses the flag.
// Both notify.
function ResolveFlagScreenInner({ flagId, workspace }: { flagId: string } & WorkspaceProps) {
  const t = useT();
  const locale = useLocale();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const toast = useToast();
  const flagQuery = useFlag(workspace.workspaceId, flagId);
  const flag = flagQuery.data ?? null;
  const history = useEntryHistory(workspace.workspaceId, flag?.entryId);
  const resolve = useResolveFlag(workspace.workspaceId);
  const [typed, setTyped] = useState<string | null>(null);
  const proposed = flag ? (flag.suggestedHours ?? flag.loggedHours) : null;
  const hoursText = typed ?? (proposed == null ? '' : formatHours(proposed, locale, { unit: false }));
  const fixHours = parseHours(hoursText);
  // The day as it stands (CHQ-156): with several jobs, the employer changes the right job on the day page and
  // approves the total as it stands, since a flag is about the day, not one job.
  const day = useEntries(
    workspace.workspaceId,
    flag ? toIsoDate(flag.workDate) : '1970-01-01',
    flag ? toIsoDate(flag.workDate) : '1970-01-01',
    flag?.membershipId,
    !!flag,
  );
  const entry = day.data?.[0] ?? null;
  const jobCount = entry?.jobs.length ?? 0;

  const act = async (action: 'FIX' | 'DISMISS', hours: number | null = fixHours) => {
    if (!flag) return;
    if (action === 'FIX' && hours === null) return;
    try {
      await resolve.mutateAsync({
        flagId,
        resolve: action === 'FIX' && hours !== null ? { action, hours } : { action: 'DISMISS' },
      });
      void haptic('success');
      toast.show(
        action === 'FIX' && hours !== null
          ? t('flags.resolvedFixed', {
              before: formatHours(flag.loggedHours, locale),
              after: formatHours(hours, locale),
            })
          : t('flags.resolvedDismissed', { hours: formatHours(flag.loggedHours, locale) }),
      );
      router.back();
    } catch (e) {
      void haptic('error');
      toast.show(await problemMessage(e, t), 'danger');
    }
  };

  if (flagQuery.isError || (flagQuery.isSuccess && !flag)) {
    return (
      <Screen testID="flag-missing">
        <Header title={t('flags.title')} back large={false} />
        <EmptyState icon="flag" title={t('errors.NOT_FOUND')} />
      </Screen>
    );
  }
  if (!flag) return <Screen testID="flag-loading">{null}</Screen>;
  const date = toIsoDate(flag.workDate);
  const first = flag.memberName.split(' ')[0] ?? flag.memberName;
  const open = flag.status === 'OPEN';
  return (
    <Screen testID="resolve-flag-screen">
      <Header
        title={t('flags.flagFrom', { name: first })}
        subtitle={formatDate(date, locale, 'long')}
        back
        large={false}
      />
      {!open ? (
        <Pill
          label={flag.status === 'FIXED' ? t('status.fixed') : t('status.dismissed')}
          tone={flag.status === 'FIXED' ? 'success' : 'neutral'}
        />
      ) : null}
      <View style={s.tiles}>
        <Card style={s.tile}>
          <AppText variant="small" tone="muted">
            {t('flags.youLogged')}
          </AppText>
          <Numeral
            value={formatHours(flag.loggedHours, locale, { unit: false })}
            unit={t('common.hourUnit')}
            variant="h1"
          />
        </Card>
        {flag.suggestedHours != null ? (
          <Card style={s.tile}>
            <AppText variant="small" tone="muted">
              {t('flags.says', { name: first })}
            </AppText>
            <Numeral
              value={formatHours(flag.suggestedHours, locale, { unit: false })}
              unit={t('common.hourUnit')}
              variant="h1"
            />
          </Card>
        ) : null}
      </View>
      <Card tint>
        <View style={s.quote}>
          <Avatar name={flag.memberName} size={24} colour="PURPLE" />
          <AppText variant="small" tone="muted">
            {t('flags.raised', {
              when: `${formatDate(toIsoDate(flag.raisedAt), locale, 'weekdayDay')}, ${formatTime(flag.raisedAt.toISOString(), locale, workspace.timezone)}`,
            })}
          </AppText>
        </View>
        <AppText variant="lead">{`"${flag.message}"`}</AppText>
      </Card>
      <View>
        <AppText variant="eyebrow" tone="accent">
          {t('entry.history')}
        </AppText>
        {history.data ? <HistoryList changes={history.data} timezone={workspace.timezone} /> : null}
      </View>
      {open && jobCount > 1 && entry ? (
        <View style={s.actions} testID="flag-several-jobs">
          <AppText variant="small" tone="muted">
            {t('flags.severalJobs', { count: jobCount })}
          </AppText>
          <Button
            label={t('flags.changeJobs')}
            icon="edit"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/day/[membershipId]/[date]',
                params: { membershipId: flag.membershipId, date },
              })
            }
            testID="flag-change-jobs"
          />
          <Button
            label={t('flags.approveAsIs', { hours: formatHours(entry.hours, locale) })}
            icon="check"
            onPress={() => void act('FIX', entry.hours)}
            loading={resolve.isPending}
            testID="flag-approve-as-is"
          />
          <Button
            label={t('flags.keepHours', { hours: formatHours(flag.loggedHours, locale) })}
            variant="outline"
            onPress={() => void act('DISMISS')}
            loading={resolve.isPending}
            hapticKind="select"
            testID="flag-dismiss"
          />
          <AppText variant="caption" tone="muted" align="center" testID="flag-decline-note">
            {workspace.notifyFlagDeclined
              ? t('flags.declineTold', { name: first })
              : t('flags.declineQuiet', { name: first })}
          </AppText>
        </View>
      ) : open ? (
        <View style={s.actions}>
          {jobCount === 1 && fixHours !== null ? (
            <AppText variant="small" tone="muted">
              {t('flags.oneJob', { hours: formatHours(fixHours, locale) })}
            </AppText>
          ) : null}
          <TextField
            label={t('web.flags.hoursField')}
            value={hoursText}
            onChangeText={setTyped}
            keyboardType="decimal-pad"
            suffix={t('common.hourUnit')}
            error={fixHours === null ? t('entry.invalidHours') : undefined}
            testID="flag-hours"
          />
          <Button
            label={
              fixHours === null
                ? t('flags.changeTo', { hours: hoursText })
                : t('flags.changeTo', { hours: formatHours(fixHours, locale) })
            }
            icon="check"
            onPress={() => void act('FIX')}
            disabled={fixHours === null}
            loading={resolve.isPending}
            testID="flag-fix"
          />
          <Button
            label={t('flags.keepHours', { hours: formatHours(flag.loggedHours, locale) })}
            variant="outline"
            onPress={() => void act('DISMISS')}
            loading={resolve.isPending}
            hapticKind="select"
            testID="flag-dismiss"
          />
          <AppText variant="caption" tone="muted" align="center" testID="flag-decline-note">
            {workspace.notifyFlagDeclined
              ? t('flags.declineTold', { name: first })
              : t('flags.declineQuiet', { name: first })}
          </AppText>
        </View>
      ) : null}
    </Screen>
  );
}

export const ResolveFlagScreen = withWorkspace(ResolveFlagScreenInner);

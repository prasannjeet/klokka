import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { formatDate, formatHours, formatTime, parseHours } from '@klokka/core';
import { useEntryHistory, useFlag, useResolveFlag } from '@/data/workspace';
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

  const act = async (action: 'FIX' | 'DISMISS') => {
    if (!flag) return;
    if (action === 'FIX' && fixHours === null) return;
    try {
      await resolve.mutateAsync({
        flagId,
        resolve: action === 'FIX' && fixHours !== null ? { action, hours: fixHours } : { action: 'DISMISS' },
      });
      void haptic('success');
      toast.show(
        action === 'FIX' && fixHours !== null
          ? t('flags.resolvedFixed', {
              before: formatHours(flag.loggedHours, locale),
              after: formatHours(fixHours, locale),
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
      {open ? (
        <View style={s.actions}>
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
          <AppText variant="caption" tone="muted" align="center">
            {t('flags.toldEitherWay', { name: first })}
          </AppText>
        </View>
      ) : null}
    </Screen>
  );
}

export const ResolveFlagScreen = withWorkspace(ResolveFlagScreenInner);

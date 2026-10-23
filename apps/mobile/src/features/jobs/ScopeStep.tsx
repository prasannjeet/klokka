import { Fragment, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { JobChangeScope, JobScopeCount, JobScopeCounts } from '@klokka/api-client';
import { formatDate, type IsoDate } from '@klokka/core';
import { useJobScopeCounts } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Button, Card, Separator } from '@/ui';

const RADIO = 20;

const styles = (t: Theme) =>
  StyleSheet.create({
    body: { gap: t.space[3] },
    list: { padding: 0, overflow: 'hidden' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[3],
      minHeight: t.tapMin,
      paddingVertical: t.space[3],
      paddingHorizontal: t.space[4],
    },
    text: { flex: 1, minWidth: 0, gap: 2 },
    radio: {
      width: RADIO,
      height: RADIO,
      borderRadius: t.radius.pill,
      borderWidth: 2,
      borderColor: t.color.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: { borderColor: t.color.secondary },
    radioDot: {
      width: RADIO / 2,
      height: RADIO / 2,
      borderRadius: t.radius.pill,
      backgroundColor: t.color.secondary,
    },
  });

const COUNT: Record<JobChangeScope, keyof JobScopeCounts> = {
  ONLY_THIS: 'onlyThis',
  THIS_AND_FUTURE: 'thisAndFuture',
  ALL: 'all',
};

// Which jobs of a series a save or a removal touches (CHQ-187): only this one, this and the following ones, or the
// whole series (past included), each with how many jobs that is and how many closed months keep as they are. A
// schedule change offers only "this and following", from `scheduleFrom`. The button says what will happen.
export function ScopeStep({
  workspaceId,
  jobId,
  action,
  scheduleChange,
  scheduleFrom,
  onConfirm,
  busy,
  error,
}: {
  workspaceId: string;
  jobId: string;
  action: 'save' | 'remove';
  scheduleChange: boolean;
  // Where a changed schedule starts: the later of the job's date and today.
  scheduleFrom?: IsoDate | undefined;
  onConfirm: (scope: JobChangeScope) => void;
  busy: boolean;
  error: string | null;
}) {
  const t = useT();
  const locale = useLocale();
  const s = useThemedStyles(styles);
  const counts = useJobScopeCounts(workspaceId, jobId);
  const scopes: JobChangeScope[] = scheduleChange
    ? ['THIS_AND_FUTURE']
    : ['ONLY_THIS', 'THIS_AND_FUTURE', 'ALL'];
  const [scope, setScope] = useState<JobChangeScope>(scopes[0] as JobChangeScope);
  const countOf = (value: JobChangeScope): JobScopeCount | undefined => counts.data?.[COUNT[value]];
  const label = (value: JobChangeScope, count: JobScopeCount) =>
    value === 'ONLY_THIS'
      ? t('recurrence.onlyThis')
      : value === 'THIS_AND_FUTURE'
        ? scheduleChange
          ? // The new schedule writes its own jobs, so the old series' count would overstate the change.
            t('recurrence.futureNoCount')
          : t('recurrence.futureCount', { count: Math.max(count.jobs - 1, 0) })
        : t('recurrence.allCount', { count: count.jobs });
  const chosen = countOf(scope);
  const confirmLabel = scheduleChange
    ? t('recurrence.save')
    : t(action === 'save' ? 'recurrence.saveCount' : 'recurrence.removeCount', { count: chosen?.jobs ?? 0 });
  const confirm = () => {
    if (action === 'remove' && scope === 'ALL') {
      Alert.alert(confirmLabel, t('recurrence.removeAllConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('mobile.common.confirm'), style: 'destructive', onPress: () => onConfirm('ALL') },
      ]);
      return;
    }
    onConfirm(scope);
  };

  return (
    <View style={s.body}>
      <AppText weight={600} accessibilityRole="header">
        {t('recurrence.scopeTitle')}
      </AppText>
      {scheduleChange && scheduleFrom ? (
        <AppText variant="small" tone="muted" testID="scope-schedule-from">
          {t('recurrence.scheduleFrom', { date: formatDate(scheduleFrom, locale, 'long') })}
        </AppText>
      ) : null}
      {counts.data ? (
        <Card style={s.list}>
          <View accessibilityRole="radiogroup" accessibilityLabel={t('recurrence.scopeTitle')}>
            {scopes.map((value, i) => {
              const count = countOf(value) as JobScopeCount;
              const on = value === scope;
              return (
                <Fragment key={value}>
                  {i > 0 ? <Separator /> : null}
                  <AppPressable
                    accessibilityRole="radio"
                    accessibilityLabel={label(value, count)}
                    accessibilityState={{ checked: on }}
                    onPress={() => setScope(value)}
                    hapticKind="tick"
                    pressScale={0.99}
                    style={s.row}
                    testID={`scope-${value}`}
                  >
                    <View style={[s.radio, on ? s.radioOn : null]}>
                      {on ? <View style={s.radioDot} /> : null}
                    </View>
                    <View style={s.text}>
                      <AppText weight={on ? 600 : 400}>{label(value, count)}</AppText>
                      {count.skippedClosed > 0 ? (
                        <AppText variant="small" tone="muted">
                          {t('recurrence.skippedClosed', { count: count.skippedClosed })}
                        </AppText>
                      ) : null}
                    </View>
                  </AppPressable>
                </Fragment>
              );
            })}
          </View>
        </Card>
      ) : counts.isError ? (
        <View style={s.body}>
          <AppText tone="danger">{t('errors.NETWORK')}</AppText>
          <Button label={t('common.retry')} variant="outline" onPress={() => void counts.refetch()} />
        </View>
      ) : (
        <AppText variant="small" tone="muted">
          {t('common.loading')}
        </AppText>
      )}
      {error ? (
        <AppText tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
      <Button
        label={confirmLabel}
        variant={action === 'remove' ? 'danger' : 'primary'}
        hapticKind={action === 'remove' ? 'warning' : 'confirm'}
        disabled={!chosen || (!scheduleChange && chosen.jobs === 0)}
        loading={busy}
        onPress={confirm}
        testID="scope-confirm"
      />
    </View>
  );
}

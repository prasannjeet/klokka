import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { formatHours, formatMonthName, type IsoMonth } from '@klokka/core';
import type { MyWorkspace } from '@klokka/api-client';
import { useExportMonthCsv, useLockMonth, useMonthSummary } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { problemMessage } from '@/lib/problems';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppSheet, AppText, Button, haptic, useToast, type SheetHandle } from '@/ui';

const styles = (t: Theme) =>
  StyleSheet.create({
    actions: { flexDirection: 'row', gap: t.space[3] },
    action: { flex: 1 },
  });

export interface MonthLockExportProps {
  workspace: MyWorkspace;
  month: IsoMonth;
  locked: boolean;
  // The per-person CSV when set; the whole workspace otherwise.
  membershipId?: string | undefined;
  totalHours: number;
}

// Month lock and CSV export (CHQ-120): "Close September" confirms with the month's totals and tells
// everyone; unlocking is one tap away. The CSV is written to the cache and handed to the share sheet.
export function MonthLockExport({
  workspace,
  month,
  locked,
  membershipId,
  totalHours,
}: MonthLockExportProps) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const toast = useToast();
  const summary = useMonthSummary(workspace.workspaceId, month, false);
  const lock = useLockMonth(workspace.workspaceId);
  const exportCsv = useExportMonthCsv(workspace.workspaceId);
  const lockSheet = useRef<SheetHandle>(null);
  const monthName = formatMonthName(month, locale);

  const openLock = async () => {
    if (!locked) await summary.refetch();
    lockSheet.current?.present();
  };
  const toggleLock = async () => {
    try {
      await lock.mutateAsync({ month, lock: !locked });
      void haptic('success');
      toast.show(
        locked ? t('mobile.month.unlocked', { month: monthName }) : t('month.closed', { month: monthName }),
      );
      lockSheet.current?.dismiss();
    } catch (e) {
      void haptic('error');
      toast.show(await problemMessage(e, t), 'danger');
    }
  };
  const share = async () => {
    try {
      const csv = await exportCsv.mutateAsync(membershipId ? { month, membershipId } : { month });
      const file = new File(
        Paths.cache,
        `klokka-${workspace.slug}-${month}${membershipId ? `-${membershipId.slice(0, 8)}` : ''}.csv`,
      );
      file.write(csv);
      toast.show(t('mobile.month.exported'));
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: t('month.exportCsv') });
    } catch (e) {
      toast.show(await problemMessage(e, t), 'danger');
    }
  };

  return (
    <>
      <View style={s.actions}>
        <Button
          label={locked ? t('month.unlockMonth') : t('month.lockMonth')}
          variant="secondary"
          icon={locked ? 'unlock' : 'lock'}
          onPress={() => void openLock()}
          style={s.action}
          testID="lock-month"
        />
        <Button
          label={t('month.exportCsv')}
          variant="outline"
          icon="download"
          onPress={() => void share()}
          loading={exportCsv.isPending}
          style={s.action}
          testID="export-csv"
        />
      </View>
      <AppSheet
        ref={lockSheet}
        title={
          locked
            ? t('week.unlockMonth', { month: monthName })
            : t('month.closeMonthTitle', { month: monthName })
        }
        closeLabel={t('common.close')}
        testID="lock-sheet"
      >
        <View style={{ gap: theme.space[4] }}>
          <AppText tone="muted">
            {locked
              ? t('week.monthClosedHint', { month: monthName })
              : t('month.closeMonthHint', {
                  hours: formatHours(summary.data?.totalHours ?? totalHours, locale),
                  people: t('common.people', { count: summary.data?.members.length ?? 1 }),
                  month: monthName,
                })}
          </AppText>
          <Button
            label={locked ? t('month.unlockMonth') : t('month.closeMonth', { month: monthName })}
            icon={locked ? 'unlock' : 'lock'}
            onPress={() => void toggleLock()}
            loading={lock.isPending}
            testID="lock-confirm"
          />
        </View>
      </AppSheet>
    </>
  );
}

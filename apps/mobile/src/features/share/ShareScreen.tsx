import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { formatHours, formatMonth, formatNumber, type IsoMonth } from '@klokka/core';
import { tokens } from '@klokka/tokens';
import { useActiveWorkspace } from '@/data/me';
import { useMemberMonth } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { currentMonthIn } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText, Button, EmptyState, Header, Mark, Screen, useToast } from '@/ui';
import { withWorkspace, type WorkspaceProps } from '@/features/shell/withWorkspace';

const CARD = tokens.color.light;

const styles = (t: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: CARD.primary,
      borderRadius: t.radius.card,
      padding: t.space[5],
      gap: t.space[3],
      overflow: 'hidden',
    },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    total: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    strip: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 36 },
    bar: { flex: 1, borderRadius: 2, backgroundColor: CARD.text },
    facts: { flexDirection: 'row', gap: t.space[4] },
    fact: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    foot: { flexDirection: 'row', justifyContent: 'space-between' },
    actions: { gap: t.space[2] },
  });

// The shareable monthly card (CHQ-138): hours and the workspace, never pay. Captured exactly as
// shown with react-native-view-shot and handed to the system share sheet (which covers "save").
function ShareScreenInner({
  month: monthParam,
  workspace,
}: { month?: IsoMonth | undefined } & WorkspaceProps) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const toast = useToast();
  const { me } = useActiveWorkspace();
  const month = monthParam ?? currentMonthIn(workspace.timezone);
  const data = useMemberMonth(workspace.workspaceId, workspace.membershipId, month);
  const card = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const monthLabel = formatMonth(month, locale, { capitalize: true });

  const share = async (save: boolean) => {
    setBusy(true);
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1, width: 1200, height: 630 });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: t('share.title'),
        UTI: 'public.png',
      });
      toast.show(save ? t('share.saved') : t('share.shared'));
    } catch {
      toast.show(t('errors.INTERNAL'), 'danger');
    } finally {
      setBusy(false);
    }
  };

  const days = data.data?.days ?? [];
  const max = Math.max(...days.map((d) => d.hours ?? 0), 1);
  return (
    <Screen testID="share-screen">
      <Header
        title={t('share.title')}
        subtitle={data.data?.locked ? t('month.closed', { month: monthLabel }) : monthLabel}
        back
        large={false}
      />
      {data.isError ? (
        <EmptyState
          icon="alert"
          title={t('errors.NETWORK')}
          actionLabel={t('common.retry')}
          onAction={() => void data.refetch()}
        />
      ) : null}
      {data.data ? (
        <View
          ref={card}
          collapsable={false}
          style={s.card}
          accessible
          accessibilityLabel={t('share.cardLabelDays', {
            month: monthLabel,
            hours: formatNumber(data.data.totalHours, locale),
            workspace: workspace.name,
            days: data.data.daysWorked,
          })}
          testID="share-card"
        >
          <View style={s.head}>
            <View style={s.brand}>
              <Mark size={20} color={CARD.text} />
              <AppText variant="h3" color={CARD.text}>
                klokka
              </AppText>
            </View>
            <AppText variant="small" weight={600} color={CARD.text}>
              {monthLabel}
            </AppText>
          </View>
          <AppText variant="small" color={CARD.text}>
            {t('share.myMonthAt', { month: monthLabel.toLocaleLowerCase(locale), workspace: workspace.name })}
          </AppText>
          <View style={s.total}>
            <AppText variant="displayXl" color={CARD.text} style={{ fontSize: 72, lineHeight: 76 }}>
              {formatHours(data.data.totalHours, locale, { unit: false })}
            </AppText>
            <AppText variant="h2" color={CARD.text}>
              {t('common.hourUnit')}
            </AppText>
          </View>
          <View style={s.strip} accessibilityElementsHidden>
            {days.map((d) => (
              <View
                key={d.date.getTime()}
                style={[
                  s.bar,
                  {
                    height: `${Math.max(6, Math.round(((d.hours ?? 0) / max) * 100))}%`,
                    opacity: (d.hours ?? 0) > 0 ? 1 : 0.18,
                  },
                ]}
              />
            ))}
          </View>
          <View style={s.facts}>
            <View style={s.fact}>
              <AppText variant="h3" color={CARD.text}>
                {data.data.daysWorked}
              </AppText>
              <AppText variant="small" color={CARD.text}>
                {t('share.days')}
              </AppText>
            </View>
            {/* Averages and the best week are analysis, which the employer may turn off (CHQ-156). */}
            {workspace.employeesSeeInsights ? (
              <>
                <View style={s.fact}>
                  <AppText variant="h3" color={CARD.text}>
                    {formatHours(data.data.avgPerWorkingDay, locale)}
                  </AppText>
                  <AppText variant="small" color={CARD.text}>
                    {t('share.aDay')}
                  </AppText>
                </View>
                <View style={s.fact}>
                  <AppText variant="h3" color={CARD.text}>
                    {formatHours(data.data.bestWeek?.hours ?? 0, locale)}
                  </AppText>
                  <AppText variant="small" color={CARD.text}>
                    {t('share.bestWeek')}
                  </AppText>
                </View>
              </>
            ) : null}
          </View>
          <View style={s.foot}>
            <AppText variant="small" weight={600} color={CARD.text}>
              {me?.user.name ?? ''}
            </AppText>
            <AppText variant="small" color={CARD.text}>
              {t('share.hoursOnlyNoPay')}
            </AppText>
          </View>
        </View>
      ) : null}
      <View style={s.actions}>
        <Button
          label={t('common.share')}
          icon="share"
          onPress={() => void share(false)}
          loading={busy}
          disabled={!data.data}
          testID="share-button"
        />
        <Button
          label={t('common.saveImage')}
          variant="outline"
          icon="image"
          onPress={() => void share(true)}
          disabled={!data.data || busy}
          hapticKind="select"
          testID="save-button"
        />
      </View>
      <AppText variant="caption" tone="muted" align="center">
        {t('share.cardHint')}
      </AppText>
      <View style={{ height: theme.space[2] }} />
    </Screen>
  );
}

export const ShareScreen = withWorkspace(ShareScreenInner);

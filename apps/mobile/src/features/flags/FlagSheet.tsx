import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Entry, FlagReason } from '@klokka/api-client';
import { formatDate, formatHours, parseHours } from '@klokka/core';
import { useRaiseFlag } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { problemMessage } from '@/lib/problems';
import { toIsoDate } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppSheet, AppText, Button, Chip, TextField, haptic, useToast, type SheetHandle } from '@/ui';

export interface FlagSheetHandle {
  open: (entry: Entry) => void;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  });

// "Flag this entry" (CHQ-135, employee): one of three reasons, the hours they say, a message. The
// flag stays open on the day until the employer resolves it.
export const FlagSheet = forwardRef<
  FlagSheetHandle,
  { workspaceId: string; employerName: string; onSent?: () => void }
>(function FlagSheet({ workspaceId, employerName, onSent }, ref) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const toast = useToast();
  const sheet = useRef<SheetHandle>(null);
  const raise = useRaiseFlag(workspaceId);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [reason, setReason] = useState<FlagReason>('MORE');
  const [hours, setHours] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    open: (next) => {
      setEntry(next);
      setReason('MORE');
      setHours('');
      setMessage('');
      setError(null);
      sheet.current?.present();
    },
  }));

  if (!entry) return <AppSheet ref={sheet} closeLabel={t('common.close')} />;
  const date = toIsoDate(entry.workDate);
  const suggested = reason === 'NOT_IN' ? 0 : parseHours(hours);
  const valid = message.trim().length > 0 && (reason === 'NOT_IN' || suggested !== null);

  const send = async () => {
    setError(null);
    if (message.trim() === '') {
      setError(t('mobile.flags.messageRequired'));
      return;
    }
    try {
      await raise.mutateAsync({
        entryId: entry.id,
        flag: { reason, message: message.trim(), suggestedHours: suggested },
      });
      void haptic('success');
      toast.show(t('mobile.flags.sent', { name: employerName }));
      onSent?.();
      sheet.current?.dismiss();
    } catch (e) {
      void haptic('error');
      setError(await problemMessage(e, t));
    }
  };

  const reasons: { value: FlagReason; label: string }[] = [
    { value: 'MORE', label: t('flags.reasonMore') },
    { value: 'LESS', label: t('flags.reasonLess') },
    { value: 'NOT_IN', label: t('flags.reasonNotIn') },
  ];

  return (
    <AppSheet
      ref={sheet}
      title={t('flags.flagDay', { date: formatDate(date, locale, 'weekdayDayMonth') })}
      subtitle={t('flags.sheetHint', { hours: formatHours(entry.hours, locale), name: employerName })}
      closeLabel={t('common.close')}
      onDismiss={() => setEntry(null)}
      testID="flag-sheet"
    >
      <View style={{ gap: theme.space[4] }}>
        <View style={s.chips}>
          {reasons.map((r) => (
            <Chip
              key={r.value}
              label={r.label}
              selected={reason === r.value}
              onPress={() => setReason(r.value)}
              testID={`reason-${r.value}`}
            />
          ))}
        </View>
        {reason !== 'NOT_IN' ? (
          <TextField
            label={t('flags.hoursYouWorked')}
            hint={t('flags.entrySays', { hours: formatHours(entry.hours, locale) })}
            value={hours}
            onChangeText={setHours}
            keyboardType="decimal-pad"
            suffix={t('common.hourUnit')}
            error={hours.trim() !== '' && suggested === null ? t('entry.invalidHours') : undefined}
            testID="flag-hours"
          />
        ) : null}
        <TextField
          label={t('flags.message')}
          placeholder={t('flags.messagePlaceholder')}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
          testID="flag-message"
        />
        {error ? (
          <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
            {error}
          </AppText>
        ) : null}
        <Button
          label={t('flags.sendFlag')}
          icon="flag"
          onPress={() => void send()}
          disabled={!valid}
          loading={raise.isPending}
          testID="flag-send"
        />
        <AppText variant="caption" tone="muted" align="center">
          {t('flags.sendFlagHint', { name: employerName })}
        </AppText>
      </View>
    </AppSheet>
  );
});

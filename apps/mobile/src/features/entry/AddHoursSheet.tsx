import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { Entry, MyWorkspace, Rounding } from '@klokka/api-client';
import {
  QUICK_CHIPS,
  formatDate,
  formatHours,
  joinHours,
  minuteOptions,
  roundHours,
  splitHours,
  type IsoDate,
} from '@klokka/core';
import { useDeleteEntry, useUpsertEntry } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { problemMessage } from '@/lib/problems';
import { todayIn } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppSheet, AppText, Button, Chip, TextField, Wheel, haptic, useToast, type SheetHandle } from '@/ui';

export interface AddHoursTarget {
  membershipId: string;
  memberName: string;
  date: IsoDate;
  // The entry already on that day, if any (editing replaces it).
  existing?: Entry | null;
  // Yesterday's hours for the "same as yesterday" chip.
  yesterdayHours?: number | null;
  // What the workspace rounding rule would make of the typed value is shown, never guessed.
  rounding: Rounding;
  defaultDayHours: number;
}

const HOUR_VALUES = Array.from({ length: 25 }, (_, i) => i);

export interface AddHoursSheetHandle {
  open: (target: AddHoursTarget) => void;
  dismiss: () => void;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    // The time card is a well in the raised sheet; the band marks the row the wheels choose.
    card: {
      backgroundColor: t.color.surface2,
      borderRadius: t.radius.card,
      borderWidth: 1,
      borderColor: t.color.border,
      padding: t.space[3],
      gap: t.space[2],
    },
    wheels: { flexDirection: 'row', gap: t.space[2] },
    band: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: t.tapMin * 2,
      height: t.tapMin,
      borderRadius: t.radius.md,
      backgroundColor: t.color.surface,
      borderWidth: 1,
      borderColor: t.color.secondary,
    },
    note: { minHeight: t.tapMin * 2, textAlignVertical: 'top' },
    chips: { gap: t.space[2], paddingHorizontal: t.space[5] },
    chipRow: { marginHorizontal: -t.space[5] },
    actions: { gap: t.space[2] },
  });

// The quick-add sheet (CHQ-117): an hours wheel and a minutes wheel (CHQ-155; the minutes are the ones the
// workspace rounding allows, every minute when nothing is rounded), quick picks below them, and the button
// always says what it will save. The API still stores decimal hours; 7 h 15 min is saved as 7.25.
export const AddHoursSheet = forwardRef<
  AddHoursSheetHandle,
  { workspace: MyWorkspace; onSaved?: (entry: Entry) => void }
>(function AddHoursSheet({ workspace, onSaved }, ref) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const toast = useToast();
  const sheet = useRef<SheetHandle>(null);
  const upsert = useUpsertEntry(workspace.workspaceId);
  const remove = useDeleteEntry(workspace.workspaceId);
  const [target, setTarget] = useState<AddHoursTarget | null>(null);
  const [time, setTime] = useState({ hours: 0, minutes: 0 });
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    open: (next) => {
      setTarget(next);
      setTime(splitHours(next.existing?.hours ?? 0, next.rounding));
      setNote(next.existing?.note ?? '');
      setError(null);
      sheet.current?.present();
    },
    dismiss: () => sheet.current?.dismiss(),
  }));

  if (!target) return <AppSheet ref={sheet} closeLabel={t('common.close')} testID="add-hours-sheet-empty" />;

  const today = todayIn(workspace.timezone);
  const title =
    target.date === today
      ? t('entry.sheetTitle', { name: target.memberName })
      : t('mobile.entry.sheetTitleDate', {
          name: target.memberName,
          date: formatDate(target.date, locale, 'weekdayDay'),
        });
  const minutes = minuteOptions(target.rounding);
  const setHours = (value: number) => setTime(splitHours(value, target.rounding));
  const rounded = roundHours(joinHours(time.hours, time.minutes), target.rounding);
  const canSave = rounded > 0;
  // "7 h 15 min" everywhere a person reads it; the decimal is shown once, as what gets saved.
  const duration = (h: number) => {
    const p = splitHours(h, 'NONE');
    if (p.minutes === 0) return t('common.hoursValue', { hours: String(p.hours) });
    if (p.hours === 0) return t('common.durationM', { minutes: String(p.minutes) });
    return t('common.durationHm', { hours: String(p.hours), minutes: String(p.minutes) });
  };
  const hoursLabel = duration(rounded);

  const save = async () => {
    setError(null);
    try {
      const entry = await upsert.mutateAsync({
        membershipId: target.membershipId,
        date: target.date,
        entry: { hours: rounded, note: note.trim() === '' ? null : note.trim() },
      });
      void haptic('success');
      toast.show(t('mobile.entry.saved', { hours: hoursLabel, name: target.memberName }));
      onSaved?.(entry);
      sheet.current?.dismiss();
    } catch (e) {
      void haptic('error');
      setError(await problemMessage(e, t));
    }
  };

  const clear = async () => {
    setError(null);
    try {
      await remove.mutateAsync({ membershipId: target.membershipId, date: target.date });
      toast.show(t('mobile.entry.removed'));
      sheet.current?.dismiss();
    } catch (e) {
      setError(await problemMessage(e, t));
    }
  };

  return (
    <AppSheet
      ref={sheet}
      title={title}
      subtitle={formatDate(target.date, locale, 'long')}
      closeLabel={t('common.close')}
      onDismiss={() => setTarget(null)}
      testID="add-hours-sheet"
    >
      <View style={{ gap: theme.space[4] }}>
        <View style={s.card}>
          <View style={s.wheels}>
            <View style={s.band} pointerEvents="none" />
            <Wheel
              values={HOUR_VALUES}
              value={time.hours}
              onChange={(h) => setTime({ hours: h, minutes: h === 24 ? 0 : time.minutes })}
              format={String}
              unit={t('common.hourUnit')}
              accessibilityLabel={t('entry.hoursWheel')}
              testID="wheel-hours"
            />
            <Wheel
              values={time.hours === 24 ? [0] : minutes}
              value={time.minutes}
              onChange={(m) => setTime({ hours: time.hours, minutes: m })}
              format={(m) => String(m).padStart(2, '0')}
              unit={t('common.minuteUnit')}
              accessibilityLabel={t('entry.minutesWheel')}
              testID="wheel-minutes"
            />
          </View>
          <AppText variant="small" tone="muted" style={{ textAlign: 'center' }} testID="saved-as">
            {t('entry.savedAs', { hours: formatHours(rounded, locale) })}
          </AppText>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipRow}
          contentContainerStyle={s.chips}
          accessibilityLabel={t('week.quickHours')}
        >
          {QUICK_CHIPS.map((value, i) => (
            <Chip
              key={value}
              label={duration(value)}
              selected={rounded === value}
              onPress={() => setHours(value)}
              index={i}
              testID={`chip-${value}`}
            />
          ))}
          <Chip
            label={t('week.fullDayWithHours', { hours: duration(target.defaultDayHours) })}
            selected={rounded === target.defaultDayHours}
            onPress={() => setHours(target.defaultDayHours)}
            index={QUICK_CHIPS.length}
            testID="chip-full-day"
          />
          {target.yesterdayHours != null && target.yesterdayHours > 0 ? (
            <Chip
              label={t('week.sameAsYesterdayWithHours', { hours: duration(target.yesterdayHours) })}
              icon="history"
              selected={rounded === target.yesterdayHours}
              onPress={() => setHours(target.yesterdayHours as number)}
              index={QUICK_CHIPS.length + 1}
              testID="same-as-yesterday"
            />
          ) : null}
        </ScrollView>
        <TextField
          label={t('week.noteOptional')}
          placeholder={t('week.notePlaceholder')}
          value={note}
          onChangeText={setNote}
          maxLength={200}
          multiline
          numberOfLines={3}
          style={s.note}
          testID="entry-note"
        />
        {error ? (
          <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
            {error}
          </AppText>
        ) : null}
        <View style={s.actions}>
          <Button
            label={t('entry.saveFor', { hours: hoursLabel, name: target.memberName })}
            onPress={() => void save()}
            disabled={!canSave}
            loading={upsert.isPending}
            testID="save-hours"
          />
          {target.existing ? (
            <Button
              label={t('mobile.entry.remove')}
              variant="ghost"
              onPress={() => void clear()}
              loading={remove.isPending}
              hapticKind="warning"
              testID="remove-hours"
            />
          ) : null}
        </View>
      </View>
    </AppSheet>
  );
});

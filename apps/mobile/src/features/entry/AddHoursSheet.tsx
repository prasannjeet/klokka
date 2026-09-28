import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Entry, MyWorkspace, Rounding } from '@klokka/api-client';
import {
  QUICK_CHIPS,
  formatDate,
  formatHours,
  isValidHours,
  roundHours,
  stepHours,
  type IsoDate,
} from '@klokka/core';
import { useDeleteEntry, useUpsertEntry } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { problemMessage } from '@/lib/problems';
import { todayIn } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import {
  AppSheet,
  AppText,
  Button,
  Chip,
  Field,
  Numeral,
  Stepper,
  TextField,
  haptic,
  useToast,
  type SheetHandle,
} from '@/ui';

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

export interface AddHoursSheetHandle {
  open: (target: AddHoursTarget) => void;
  dismiss: () => void;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
    actions: { gap: t.space[2] },
  });

// The quick-add sheet (CHQ-117): chips set the number, the stepper nudges it by half an hour,
// "same as yesterday" repeats, and the button always says what it will save. A haptic on every chip.
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
  const [hours, setHours] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    open: (next) => {
      setTarget(next);
      setHours(next.existing?.hours ?? 0);
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
  const rounded = roundHours(hours, target.rounding);
  const canSave = isValidHours(rounded) && rounded > 0;
  const hoursLabel = formatHours(rounded, locale);

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
        <View style={s.top}>
          <Numeral
            value={formatHours(rounded, locale, { unit: false })}
            unit={t('common.hourUnit')}
            variant="displayXl"
            accessibilityLabel={hoursLabel}
            testID="hours-numeral"
          />
          <Stepper
            onDecrement={() => setHours((h) => stepHours(h, -1))}
            onIncrement={() => setHours((h) => stepHours(h, 1))}
            decrementLabel={t('entry.halfHourLess')}
            incrementLabel={t('entry.halfHourMore')}
            canDecrement={hours > 0}
            canIncrement={hours < 24}
          />
        </View>
        <View style={s.chips} accessibilityLabel={t('week.quickHours')}>
          {QUICK_CHIPS.map((value, i) => (
            <Chip
              key={value}
              label={formatHours(value, locale, { unit: false })}
              selected={rounded === value}
              onPress={() => setHours(value)}
              index={i}
              testID={`chip-${value}`}
            />
          ))}
          <Chip
            label={t('week.fullDayWithHours', {
              hours: formatHours(target.defaultDayHours, locale, { unit: false }),
            })}
            selected={rounded === target.defaultDayHours}
            onPress={() => setHours(target.defaultDayHours)}
            index={QUICK_CHIPS.length}
            testID="chip-full-day"
          />
        </View>
        {target.yesterdayHours != null && target.yesterdayHours > 0 ? (
          <Button
            label={t('week.sameAsYesterdayWithHours', { hours: formatHours(target.yesterdayHours, locale) })}
            variant="outline"
            icon="history"
            compact
            hapticKind="tick"
            onPress={() => setHours(target.yesterdayHours as number)}
            testID="same-as-yesterday"
          />
        ) : null}
        <Field label={t('week.noteOptional')}>
          <TextField
            label={t('week.note')}
            placeholder={t('week.notePlaceholder')}
            value={note}
            onChangeText={setNote}
            maxLength={200}
            testID="entry-note"
          />
        </Field>
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

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { Entry, MyWorkspace, Rounding } from '@klokka/api-client';
import {
  QUICK_CHIPS,
  formatDate,
  formatHours,
  isValidHours,
  parseHours,
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
    hoursRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, flexShrink: 1 },
    hoursInput: { ...t.text('displayXl'), color: t.color.text, padding: 0, minWidth: t.space[9] },
    note: { minHeight: t.tapMin * 2, textAlignVertical: 'top' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
    actions: { gap: t.space[2] },
  });

// The quick-add sheet (CHQ-117): the big number is typed (any value the workspace rounding allows, CHQ-154),
// chips set it, the stepper nudges it by half an hour,
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
  // The typed text is the source of truth; chips and the stepper write a formatted number into it.
  const [hoursText, setHoursText] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    open: (next) => {
      setTarget(next);
      setHoursText(next.existing ? formatHours(next.existing.hours, locale, { unit: false }) : '');
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
  const parsed = parseHours(hoursText);
  const hours = parsed ?? 0;
  const setHours = (value: number) => setHoursText(formatHours(value, locale, { unit: false }));
  const rounded = roundHours(hours, target.rounding);
  const canSave = parsed !== null && isValidHours(rounded) && rounded > 0;
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
          <View style={s.hoursRow}>
            <TextInput
              value={hoursText}
              onChangeText={setHoursText}
              placeholder="0"
              placeholderTextColor={theme.color.textMuted}
              keyboardType="decimal-pad"
              selectTextOnFocus
              maxLength={5}
              accessibilityLabel={t('entry.hoursYouWorked')}
              selectionColor={theme.color.primary}
              cursorColor={theme.color.primary}
              style={s.hoursInput}
              testID="hours-input"
            />
            <AppText variant="h3" weight={700} tone="muted">
              {t('common.hourUnit')}
            </AppText>
          </View>
          <Stepper
            onDecrement={() => setHours(stepHours(hours, -1))}
            onIncrement={() => setHours(stepHours(hours, 1))}
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
        {hoursText !== '' && parsed === null ? (
          <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
            {t('entry.invalidHours')}
          </AppText>
        ) : null}
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

import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { matchesTimeZone, timeZoneLabel, timeZoneOptions } from '@klokka/core';
import { useT } from '@/i18n/LocaleProvider';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppSheet, AppText, Field, Icon, TextField, type SheetHandle } from '@/ui';

// Rows shown at once: the sheet sizes itself from its content, so the list is a search result with a
// short head (Europe first with an empty query), never a long scroll inside a native sheet.
const VISIBLE = 8;

const styles = (t: Theme) =>
  StyleSheet.create({
    control: {
      minHeight: 52,
      borderRadius: t.radius.md,
      borderWidth: 1.5,
      borderColor: t.color.border,
      backgroundColor: t.color.surface2,
      paddingHorizontal: t.space[4],
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[2],
    },
    row: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[3],
      paddingVertical: t.space[2],
    },
    selected: {
      backgroundColor: t.color.surface2,
      marginHorizontal: -t.space[3],
      paddingHorizontal: t.space[3],
      borderRadius: t.radius.md,
    },
  });

// The workspace time zone as a picker of IANA zones (CHQ-145, was free text): a field that opens a
// sheet with a search box and the matching zones, Europe first; the default is the phone's own zone.
export function TimeZoneField({
  value,
  onChange,
  hint,
}: {
  value: string;
  onChange: (zone: string) => void;
  hint?: string | undefined;
}) {
  const t = useT();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const sheet = useRef<SheetHandle>(null);
  const [query, setQuery] = useState('');
  const options = useMemo(() => timeZoneOptions(value), [value]);
  const matches = options.filter((zone) => matchesTimeZone(zone, query)).slice(0, VISIBLE);
  const pick = (zone: string) => {
    onChange(zone);
    setQuery('');
    sheet.current?.dismiss();
  };
  return (
    <>
      <Field label={t('workspace.timezone')} hint={hint}>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t('mobile.workspace.timezoneChange', { timezone: timeZoneLabel(value) })}
          onPress={() => sheet.current?.present()}
          hapticKind="select"
          style={s.control}
          testID="workspace-timezone"
        >
          <AppText weight={500} style={{ flex: 1 }} numberOfLines={1}>
            {timeZoneLabel(value)}
          </AppText>
          <Icon name="chevron-down" size={18} color={theme.color.textMuted} />
        </AppPressable>
      </Field>
      <AppSheet
        ref={sheet}
        title={t('workspace.timezone')}
        closeLabel={t('common.close')}
        onDismiss={() => setQuery('')}
        testID="timezone-sheet"
      >
        <TextField
          label={t('mobile.workspace.timezoneSearch')}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          testID="timezone-search"
        />
        <View accessibilityRole="radiogroup">
          {matches.length === 0 ? (
            <AppText tone="muted">{t('mobile.workspace.timezoneNoMatch')}</AppText>
          ) : null}
          {matches.map((zone) => {
            const selected = zone === value;
            return (
              <AppPressable
                key={zone}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={timeZoneLabel(zone)}
                onPress={() => pick(zone)}
                hapticKind="tick"
                style={[s.row, selected ? s.selected : null]}
                testID={`timezone-${zone}`}
              >
                <AppText weight={selected ? 700 : 500} style={{ flex: 1 }}>
                  {timeZoneLabel(zone)}
                </AppText>
                {selected ? <Icon name="check" size={20} color={theme.color.accent} /> : null}
              </AppPressable>
            );
          })}
        </View>
      </AppSheet>
    </>
  );
}

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { WeekStart, WorkspaceColour } from '@klokka/api-client';
import { useCreateWorkspace } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { problemMessage } from '@/lib/problems';
import { useAppStore } from '@/store/appStore';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import {
  AppPressable,
  AppSwitch,
  AppText,
  Avatar,
  Button,
  Card,
  Chip,
  Field,
  Header,
  Screen,
  TextField,
  useToast,
} from '@/ui';

export const WORKSPACE_EMOJIS = ['☕', '🥐', '✂️', '🧹', '🌸', '🍕', '🛒', '🔧', '🐝', '🎨', '🚚', '🏋️'];
export const WORKSPACE_COLOURS: WorkspaceColour[] = ['PRIMARY', 'BLUE', 'GREEN', 'PURPLE', 'YELLOW', 'INK'];
export const CURRENCIES = ['SEK', 'NOK', 'DKK', 'EUR', 'GBP', 'USD'];

export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Stockholm';
  } catch {
    return 'Europe/Stockholm';
  }
}

const styles = (t: Theme) =>
  StyleSheet.create({
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
    swatch: {
      width: 40,
      height: 40,
      borderRadius: t.radius.pill,
      borderWidth: 3,
      borderColor: 'transparent',
    },
    swatchOn: { borderColor: t.color.text },
    emoji: {
      width: 44,
      height: 44,
      borderRadius: t.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.color.surface2,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    emojiOn: { borderColor: t.color.primary },
    preview: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.space[3] },
  });

// "Create your workspace" (CHQ-112): name, emoji and colour, time zone, currency, week start, pay.
export function CreateWorkspaceScreen() {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const toast = useToast();
  const create = useCreateWorkspace();
  const setActive = useAppStore((st) => st.setActiveWorkspace);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(WORKSPACE_EMOJIS[0] as string);
  const [colour, setColour] = useState<WorkspaceColour>('PRIMARY');
  const [timezone, setTimezone] = useState(deviceTimezone());
  const [currency, setCurrency] = useState(locale === 'sv' ? 'SEK' : 'EUR');
  const [weekStart, setWeekStart] = useState<WeekStart>('MONDAY');
  const [showPay, setShowPay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim().length >= 2 && timezone.trim().length > 0;

  const submit = async () => {
    setError(null);
    try {
      const workspace = await create.mutateAsync({
        name: name.trim(),
        timezone: timezone.trim(),
        currency,
        weekStart,
        colour,
        emoji,
        showPay,
      });
      setActive(workspace.id);
      toast.show(t('workspace.created'));
      router.replace('/');
    } catch (e) {
      setError(await problemMessage(e, t));
    }
  };

  return (
    <Screen testID="create-workspace">
      <Header title={t('workspace.createTitle')} subtitle={t('workspace.createHint')} back />
      <Card>
        <View style={s.preview}>
          <Avatar name={name || t('workspace.name')} emoji={emoji} colour={colour} size={48} square />
          <View style={{ flex: 1 }}>
            <AppText variant="h3" numberOfLines={1}>
              {name.trim() || t('workspace.namePlaceholder')}
            </AppText>
            <AppText variant="small" tone="muted">
              {t('workspace.switcherPreview')}
            </AppText>
          </View>
        </View>
      </Card>
      <TextField
        label={t('workspace.name')}
        placeholder={t('workspace.namePlaceholder')}
        hint={t('workspace.nameHint')}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        testID="workspace-name"
      />
      <Field label={t('workspace.emoji')} hint={t('workspace.colourAndEmojiHint')}>
        <View style={s.wrap} accessibilityLabel={t('mobile.workspace.emojiPick')}>
          {WORKSPACE_EMOJIS.map((e) => (
            <AppPressable
              key={e}
              accessibilityRole="button"
              accessibilityLabel={e}
              accessibilityState={{ selected: e === emoji }}
              onPress={() => setEmoji(e)}
              hapticKind="tick"
              style={[s.emoji, e === emoji ? s.emojiOn : null]}
            >
              <AppText style={{ fontSize: 22, lineHeight: 30 }}>{e}</AppText>
            </AppPressable>
          ))}
        </View>
      </Field>
      <Field label={t('workspace.colour')}>
        <View style={s.wrap} accessibilityLabel={t('mobile.workspace.colourPick')}>
          {WORKSPACE_COLOURS.map((c) => (
            <AppPressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={c}
              accessibilityState={{ selected: c === colour }}
              onPress={() => setColour(c)}
              hapticKind="tick"
              style={[
                s.swatch,
                { backgroundColor: theme.workspace(c).fill },
                c === colour ? s.swatchOn : null,
              ]}
            />
          ))}
        </View>
      </Field>
      <TextField
        label={t('workspace.timezone')}
        hint={t('mobile.workspace.timezoneDevice', { timezone: deviceTimezone() })}
        value={timezone}
        onChangeText={setTimezone}
        autoCapitalize="none"
        autoCorrect={false}
        testID="workspace-timezone"
      />
      <Field label={t('workspace.currency')} hint={t('workspace.currencyHint')}>
        <View style={s.wrap}>
          {CURRENCIES.map((c, i) => (
            <Chip
              key={c}
              label={c}
              selected={c === currency}
              onPress={() => setCurrency(c)}
              index={i}
              testID={`currency-${c}`}
            />
          ))}
        </View>
      </Field>
      <Field label={t('workspace.weekStartsOn')} hint={t('workspace.timezoneHint')}>
        <View style={s.wrap}>
          <Chip
            label={t('workspace.monday')}
            selected={weekStart === 'MONDAY'}
            onPress={() => setWeekStart('MONDAY')}
          />
          <Chip
            label={t('workspace.sunday')}
            selected={weekStart === 'SUNDAY'}
            onPress={() => setWeekStart('SUNDAY')}
            index={1}
          />
        </View>
      </Field>
      <Card>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <AppText weight={600}>{t('settings.showPay')}</AppText>
            <AppText variant="small" tone="muted">
              {t('settings.showPayShortHint')}
            </AppText>
          </View>
          <AppSwitch value={showPay} onValueChange={setShowPay} accessibilityLabel={t('settings.showPay')} />
        </View>
      </Card>
      {error ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
      <Button
        label={t('nav.createWorkspace')}
        onPress={() => void submit()}
        disabled={!valid}
        loading={create.isPending}
        icon="plus"
        testID="create-workspace-submit"
      />
    </Screen>
  );
}

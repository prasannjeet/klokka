import { StyleSheet, View } from 'react-native';
import { useMe } from '@/data/me';
import { useT } from '@/i18n/LocaleProvider';
import { useAppStore } from '@/store/appStore';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText, Button, Card, Icon, useToast } from '@/ui';
import { usePushPreference } from './usePush';

const styles = (t: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: t.space[3], alignItems: 'flex-start' },
    actions: { flexDirection: 'row', gap: t.space[2], marginTop: t.space[3] },
  });

// The one-card explanation before the OS permission prompt, shown in context (after the first
// workspace is on screen), never on cold start. Dismissed for good with "Not now".
export function PushPrompt({ employer }: { employer: boolean }) {
  const t = useT();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const toast = useToast();
  const { data: me } = useMe();
  const shown = useAppStore((st) => st.pushPromptShown);
  const setShown = useAppStore((st) => st.setPushPromptShown);
  const { register } = usePushPreference();
  if (shown || !me || me.pushTokenRegistered || !me.preferences.pushEnabled) return null;
  return (
    <Card testID="push-prompt">
      <View style={s.row}>
        <Icon name="bell" size={18} color={theme.color.accent} />
        <View style={{ flex: 1 }}>
          <AppText weight={600}>{t('mobile.push.title')}</AppText>
          <AppText variant="small" tone="muted">
            {employer ? t('mobile.push.bodyEmployer') : t('mobile.push.body')}
          </AppText>
        </View>
      </View>
      <View style={s.actions}>
        <Button
          label={t('mobile.push.enable')}
          compact
          onPress={() => void register().catch(() => toast.show(t('errors.INTERNAL'), 'danger'))}
          testID="push-enable"
        />
        <Button
          label={t('common.notNow')}
          compact
          variant="ghost"
          onPress={() => setShown(true)}
          hapticKind="select"
        />
      </View>
    </Card>
  );
}

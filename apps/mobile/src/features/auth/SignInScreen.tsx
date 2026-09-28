import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth';
import { useT } from '@/i18n/LocaleProvider';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText, Button, Clock, Mesh, Wordmark } from '@/ui';

const styles = (t: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.color.bg },
    body: { flex: 1, paddingHorizontal: t.space[5], justifyContent: 'space-between' },
    clock: { alignItems: 'center', justifyContent: 'center', flex: 1 },
    copy: { gap: t.space[3] },
    footer: { gap: t.space[3], paddingTop: t.space[5] },
  });

// The welcome screen (mockup "Welcome and sign in"): the paddle clock, the tagline, one button that
// hands over to Logto's hosted page in a Custom Tab and returns with a session.
export function SignInScreen() {
  const t = useT();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const insets = useSafeAreaInsets();
  const { signIn, failure } = useAuth();
  const [busy, setBusy] = useState(false);
  const reduced = useReducedMotion();
  const rise = (delay: number) =>
    reduced ? undefined : FadeInUp.delay(delay).duration(theme.motion.duration.rise);

  const onSignIn = async () => {
    setBusy(true);
    try {
      await signIn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.root} testID="sign-in-screen">
      <Mesh />
      <View
        style={[
          s.body,
          { paddingTop: insets.top + theme.space[5], paddingBottom: insets.bottom + theme.space[5] },
        ]}
      >
        <Animated.View entering={rise(0)}>
          <Wordmark />
        </Animated.View>
        <Animated.View style={s.clock} entering={rise(theme.motion.duration.stagger)}>
          <Clock size={180} />
        </Animated.View>
        <Animated.View style={s.copy} entering={rise(theme.motion.duration.stagger * 2)}>
          <View>
            <AppText variant="displayL" accessibilityRole="header">
              {t('mobile.welcome.taglineA')}
            </AppText>
            <AppText variant="displayL" tone="primary">
              {t('mobile.welcome.taglineB')}
            </AppText>
          </View>
          <AppText variant="lead" tone="muted">
            {t('auth.welcomeBody')}
          </AppText>
        </Animated.View>
        <Animated.View style={s.footer} entering={rise(theme.motion.duration.stagger * 3)}>
          <Button
            label={t('common.signIn')}
            iconRight="arrow-right"
            onPress={() => void onSignIn()}
            loading={busy}
            testID="sign-in-button"
          />
          {failure ? (
            <AppText variant="small" tone="danger" align="center" accessibilityLiveRegion="polite">
              {t('mobile.auth.signInFailed')}
            </AppText>
          ) : null}
          <AppText variant="caption" tone="muted" align="center">
            {t('invitation.openLinkFirst')}
          </AppText>
          <AppText variant="caption" tone="muted" align="center">
            {t('invitation.employersCreateOnWeb')}
          </AppText>
        </Animated.View>
      </View>
    </View>
  );
}

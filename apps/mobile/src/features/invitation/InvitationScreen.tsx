import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useApi } from '@/api/ApiProvider';
import { keys } from '@/data/keys';
import { useMe } from '@/data/me';
import { useAcceptInvitation } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { problemCode, problemMessage } from '@/lib/problems';
import { useAppStore } from '@/store/appStore';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText, Avatar, Button, Card, EmptyState, Header, Icon, Pill, Screen, useToast } from '@/ui';

const styles = (t: Theme) =>
  StyleSheet.create({
    facts: { gap: t.space[2] },
    fact: { flexDirection: 'row', gap: t.space[3] },
    factLabel: { width: 96 },
    hint: { flexDirection: 'row', gap: t.space[2], alignItems: 'flex-start' },
    actions: { gap: t.space[3] },
  });

// Accepting a second-workspace invitation in the app (CHQ-114): the link `klokka://invitation?token=`
// (the same token the web join page takes). First invitations are web-first (docs/DECISIONS.md D3):
// the invitee has no app yet, so this screen only ever meets a signed-in user.
export function InvitationScreen({ token }: { token: string }) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const api = useApi();
  const toast = useToast();
  const { data: me } = useMe();
  const setActive = useAppStore((st) => st.setActiveWorkspace);
  const accept = useAcceptInvitation();
  const [error, setError] = useState<string | null>(null);
  const invitation = useQuery({
    queryKey: keys.invitation(token),
    queryFn: () => api.invitations.getInvitation({ token, lang: locale }),
    enabled: token !== '',
    retry: false,
  });

  const join = async () => {
    setError(null);
    try {
      const accepted = await accept.mutateAsync(token);
      setActive(accepted.workspaceId);
      toast.show(t('invitation.accepted', { workspace: accepted.workspaceName }));
      router.replace('/');
    } catch (e) {
      const code = await problemCode(e);
      if (code === 'INVITATION_EXPIRED')
        setError(t('invitation.expired', { name: invitation.data?.inviterName ?? '' }));
      else if (code === 'INVITATION_EMAIL_MISMATCH')
        setError(t('invitation.wrongAccount', { email: invitation.data?.email ?? '' }));
      else setError(await problemMessage(e, t));
    }
  };

  if (token === '' || invitation.isError) {
    return (
      <Screen testID="invitation-invalid">
        <Header title={t('invitation.title')} back large={false} />
        <EmptyState
          icon="mail"
          title={t('mobile.invitation.notFound')}
          actionLabel={t('common.back')}
          onAction={() => router.replace('/')}
        />
      </Screen>
    );
  }
  const inv = invitation.data;
  if (!inv) {
    return (
      <Screen
        scroll={false}
        contentStyle={{ alignItems: 'center', justifyContent: 'center', gap: theme.space[3] }}
      >
        <ActivityIndicator color={theme.color.primary} />
        <AppText variant="small" tone="muted">
          {t('mobile.invitation.loading')}
        </AppText>
      </Screen>
    );
  }
  const expired = inv.status !== 'PENDING' || inv.expiresAt.getTime() < Date.now();
  return (
    <Screen testID="invitation-screen">
      <Header title={t('invitation.title')} back large={false} />
      <Avatar
        name={inv.workspaceName}
        emoji={inv.workspaceEmoji}
        colour={inv.workspaceColour}
        size={56}
        square
      />
      <View>
        <AppText variant="h1" accessibilityRole="header">
          {t('invitation.invitedBy')}
        </AppText>
        <AppText variant="h1" tone="primary">
          {inv.workspaceName}
        </AppText>
      </View>
      <AppText variant="lead" tone="muted">
        {inv.localized?.body ?? t('invitation.addedYou', { name: inv.inviterName })}
      </AppText>
      <Pill label={t('role.youJoinAsEmployee')} tone="primary" />
      <View style={s.facts}>
        {[
          [t('invitation.workspace'), inv.workspaceName],
          [t('invitation.employer'), inv.inviterName],
          [t('invitation.yourEmail'), inv.email],
        ].map(([label, value]) => (
          <View key={label} style={s.fact}>
            <AppText variant="small" tone="muted" style={s.factLabel}>
              {label}
            </AppText>
            <AppText variant="small" weight={600} style={{ flex: 1 }}>
              {value}
            </AppText>
          </View>
        ))}
      </View>
      <Card tint>
        <View style={s.hint}>
          <Icon name="info" size={18} color={theme.color.accent} />
          <AppText variant="small" tone="muted" style={{ flex: 1 }}>
            {t('invitation.privacyHint', { employer: inv.inviterName })}
          </AppText>
        </View>
      </Card>
      {expired ? (
        <AppText variant="small" tone="danger">
          {t('invitation.expired', { name: inv.inviterName })}
        </AppText>
      ) : null}
      {me?.user.email && inv.email.toLowerCase() !== me.user.email.toLowerCase() ? (
        <AppText variant="small" tone="warning">
          {t('invitation.wrongAccount', { email: inv.email })}
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
      <View style={s.actions}>
        <Button
          label={t('invitation.join', { workspace: inv.workspaceName })}
          iconRight="arrow-right"
          onPress={() => void join()}
          disabled={expired}
          loading={accept.isPending}
          testID="invitation-join"
        />
        <Button
          label={t('common.notNow')}
          variant="outline"
          onPress={() => router.replace('/')}
          hapticKind="select"
        />
      </View>
    </Screen>
  );
}

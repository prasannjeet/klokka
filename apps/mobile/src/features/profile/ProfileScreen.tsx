import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useActiveWorkspace, useSwitchWorkspace, useUpdateMe } from '@/data/me';
import { useT } from '@/i18n/LocaleProvider';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import {
  AppPressable,
  AppSheet,
  AppText,
  Avatar,
  Button,
  Card,
  Header,
  Icon,
  Row,
  Screen,
  TextField,
  useToast,
  type SheetHandle,
} from '@/ui';
import { WorkspaceRow } from '@/features/workspaces/WorkspaceRow';
import { useSignOut } from '@/features/shell/useSignOut';
import { WORKSPACE_EMOJIS } from '@/features/workspaces/CreateWorkspaceScreen';
import { AppPreferenceRows, NotificationPreferenceRows } from './PreferenceRows';

const styles = (t: Theme) =>
  StyleSheet.create({
    identity: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
    section: { gap: t.space[3] },
    emojis: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
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
  });

const AVATAR_EMOJIS = ['🐝', '🦊', '🐼', '🌻', '🍀', '⚡', '🎯', '🌙', '🍓', '🦉', '🚀', '🎸'];

// Profile and workspace switcher (CHQ-115, CHQ-134): one account for every workspace; the tick marks
// the workspace the app is showing, tapping another swaps the whole app.
export function ProfileScreen() {
  const t = useT();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const toast = useToast();
  const { me, workspace } = useActiveWorkspace();
  const switchTo = useSwitchWorkspace();
  const signOut = useSignOut();
  const updateMe = useUpdateMe();
  const editSheet = useRef<SheetHandle>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string | null>(null);

  const openEdit = () => {
    setName(me?.user.name ?? '');
    setEmoji(me?.user.avatarEmoji ?? null);
    editSheet.current?.present();
  };
  const saveProfile = async () => {
    try {
      await updateMe.mutateAsync({ name: name.trim(), avatarEmoji: emoji });
      toast.show(t('mobile.settings.saved'));
      editSheet.current?.dismiss();
    } catch {
      toast.show(t('errors.INTERNAL'), 'danger');
    }
  };

  return (
    <>
      <Screen testID="profile-screen">
        <Header title={t('profile.title')} />
        <View style={s.identity}>
          <Avatar name={me?.user.name ?? ''} emoji={me?.user.avatarEmoji} colour="PURPLE" size={56} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="h3" numberOfLines={1}>
              {me?.user.name ?? ''}
            </AppText>
            <AppText variant="small" tone="muted" numberOfLines={1}>
              {me?.user.email ?? ''}
            </AppText>
          </View>
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel={t('profile.editProfile')}
            onPress={openEdit}
            style={{ padding: theme.space[2] }}
            testID="edit-profile"
          >
            <Icon name="edit" size={22} color={theme.color.textMuted} />
          </AppPressable>
        </View>
        <View style={s.section}>
          <AppText variant="eyebrow" tone="accent">
            {t('profile.workspaces')}
          </AppText>
          {(me?.workspaces ?? []).map((w) => (
            <WorkspaceRow
              key={w.workspaceId}
              workspace={w}
              active={w.workspaceId === workspace?.workspaceId}
              onPress={() => {
                if (w.workspaceId !== workspace?.workspaceId) {
                  switchTo(w.workspaceId);
                  router.replace('/');
                }
              }}
              testID={`workspace-${w.workspaceId}`}
            />
          ))}
          <Button
            label={t('nav.createWorkspace')}
            variant="outline"
            icon="plus"
            compact
            onPress={() => router.push('/create-workspace')}
            hapticKind="select"
          />
        </View>
        <Card>
          <AppText variant="eyebrow" tone="accent">
            {t('settings.notifications')}
          </AppText>
          <NotificationPreferenceRows employer={workspace?.role === 'EMPLOYER'} />
        </Card>
        <Card>
          <AppText variant="eyebrow" tone="accent">
            {t('settings.app')}
          </AppText>
          <AppPreferenceRows />
        </Card>
        <Card>
          <Row
            title={t('common.signOut')}
            icon="log-out"
            onPress={() => void signOut()}
            chevron={false}
            testID="sign-out"
          />
        </Card>
        <AppText variant="caption" tone="muted" align="center">
          {t('profile.leavingHint')}
        </AppText>
      </Screen>
      <AppSheet
        ref={editSheet}
        title={t('profile.editProfile')}
        subtitle={t('profile.hint')}
        closeLabel={t('common.close')}
        testID="edit-profile-sheet"
      >
        <View style={{ gap: theme.space[4] }}>
          <TextField
            label={t('profile.name')}
            hint={t('profile.nameHint')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            testID="profile-name"
          />
          <View style={{ gap: theme.space[2] }}>
            <AppText variant="small" weight={600}>
              {t('profile.emojiAvatar')}
            </AppText>
            <View style={s.emojis}>
              <AppPressable
                accessibilityRole="button"
                accessibilityLabel={t('profile.initial')}
                accessibilityState={{ selected: emoji === null }}
                onPress={() => setEmoji(null)}
                hapticKind="tick"
                style={[s.emoji, emoji === null ? s.emojiOn : null]}
              >
                <AppText weight={700}>{(name.trim()[0] ?? '?').toLocaleUpperCase()}</AppText>
              </AppPressable>
              {[...AVATAR_EMOJIS, ...WORKSPACE_EMOJIS.slice(0, 4)].map((e) => (
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
            <AppText variant="caption" tone="muted">
              {t('profile.avatarHint')}
            </AppText>
          </View>
          <Button
            label={t('common.save')}
            onPress={() => void saveProfile()}
            disabled={name.trim().length < 2}
            loading={updateMe.isPending}
            testID="profile-save"
          />
        </View>
      </AppSheet>
    </>
  );
}

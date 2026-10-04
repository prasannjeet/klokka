import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';
import { useDeleteMe, useMe } from '@/data/me';
import { useSignOut } from '@/features/shell/useSignOut';
import { useT } from '@/i18n/LocaleProvider';
import { useTheme } from '@/theme';
import { AppSheet, AppText, Button, TextField, useToast, type SheetHandle } from '@/ui';

// Delete my account (CHQ-157), the same words as the web dialog. The API decides what goes (DELETE /me); this
// names the businesses the user owns first, unlocks the button once the confirmation word is typed, then signs
// out, which also ends the browser session.
export const DeleteAccountSheet = forwardRef<SheetHandle>(function DeleteAccountSheet(_props, ref) {
  const t = useT();
  const theme = useTheme();
  const toast = useToast();
  const me = useMe().data;
  const remove = useDeleteMe();
  const signOut = useSignOut();
  const sheet = useRef<SheetHandle>(null);
  const [typed, setTyped] = useState('');
  const [failed, setFailed] = useState(false);
  useImperativeHandle(ref, () => ({
    present: () => sheet.current?.present(),
    dismiss: () => sheet.current?.dismiss(),
  }));

  const workspaces = me?.workspaces ?? [];
  const owned = workspaces.filter((w) => w.role === 'EMPLOYER').map((w) => w.name);
  const word = t('account.delete.confirmWord');
  const confirmed = typed.trim().toUpperCase() === word;

  const submit = async () => {
    setFailed(false);
    try {
      await remove.mutateAsync();
    } catch {
      setFailed(true);
      return;
    }
    sheet.current?.dismiss();
    toast.show(t('account.delete.done'));
    await signOut();
  };

  return (
    <AppSheet
      ref={sheet}
      title={t('account.delete.title')}
      subtitle={t('account.delete.hint')}
      closeLabel={t('common.close')}
      onDismiss={() => {
        setTyped('');
        setFailed(false);
      }}
      testID="delete-account-sheet"
    >
      <View style={{ gap: theme.space[4] }}>
        {owned.length > 0 ? (
          <AppText variant="small" tone="danger">
            {t('account.delete.ownerWarning', { count: owned.length, workspaces: owned.join(', ') })}
          </AppText>
        ) : null}
        {workspaces.some((w) => w.role === 'EMPLOYEE') ? (
          <AppText variant="small" tone="muted">
            {t('account.delete.employeeNote')}
          </AppText>
        ) : null}
        <TextField
          label={t('account.delete.confirmLabel', { word })}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          testID="delete-account-word"
        />
        {failed ? (
          <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
            {t('account.delete.failed')}
          </AppText>
        ) : null}
        <Button
          label={t('account.delete.confirm')}
          icon="trash"
          variant="danger"
          onPress={() => void submit()}
          disabled={!confirmed}
          loading={remove.isPending}
          testID="delete-account-submit"
        />
      </View>
    </AppSheet>
  );
});

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';
import type { MyWorkspace } from '@klokka/api-client';
import { useInviteMember } from '@/data/workspace';
import { useT } from '@/i18n/LocaleProvider';
import { problemMessage } from '@/lib/problems';
import { useTheme } from '@/theme';
import { AppSheet, AppText, Button, TextField, useToast, type SheetHandle } from '@/ui';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseRate(input: string): number | null {
  const n = Number(input.replace(',', '.').trim());
  return input.trim() === '' ? null : Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

// "Add employee" (CHQ-113): name, email and, when pay is on, the hourly rate. The invitation is the
// only email Klokka sends without asking.
export const AddEmployeeSheet = forwardRef<SheetHandle, { workspace: MyWorkspace }>(function AddEmployeeSheet(
  { workspace },
  ref,
) {
  const t = useT();
  const theme = useTheme();
  const toast = useToast();
  const sheet = useRef<SheetHandle>(null);
  const invite = useInviteMember(workspace.workspaceId);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rate, setRate] = useState('');
  const [error, setError] = useState<string | null>(null);
  useImperativeHandle(ref, () => ({
    present: () => sheet.current?.present(),
    dismiss: () => sheet.current?.dismiss(),
  }));

  const reset = () => {
    setName('');
    setEmail('');
    setRate('');
    setError(null);
  };
  const rateValue = parseRate(rate);
  const valid =
    name.trim().length >= 2 &&
    EMAIL.test(email.trim()) &&
    (!workspace.showPay || rate.trim() === '' || rateValue !== null);

  const submit = async () => {
    setError(null);
    try {
      const member = await invite.mutateAsync({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        ...(workspace.showPay && rateValue !== null ? { hourlyRate: rateValue } : {}),
      });
      toast.show(t('employees.invitationSent', { when: member.displayName }));
      reset();
      sheet.current?.dismiss();
    } catch (e) {
      setError(await problemMessage(e, t));
    }
  };

  return (
    <AppSheet
      ref={sheet}
      title={t('employees.addEmployee')}
      subtitle={t('employees.addEmployeeShortHint')}
      closeLabel={t('common.close')}
      onDismiss={reset}
      testID="add-employee-sheet"
    >
      <View style={{ gap: theme.space[4] }}>
        <TextField
          label={t('employees.name')}
          placeholder={t('employees.namePlaceholder')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          testID="employee-name"
        />
        <TextField
          label={t('employees.email')}
          placeholder={t('employees.emailPlaceholder')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          testID="employee-email"
        />
        {workspace.showPay ? (
          <TextField
            label={t('employees.hourlyRatePayOn')}
            placeholder={t('employees.ratePlaceholder')}
            value={rate}
            onChangeText={setRate}
            keyboardType="decimal-pad"
            suffix={`${workspace.currency}/h`}
            testID="employee-rate"
          />
        ) : (
          <AppText variant="caption" tone="muted">
            {t('employees.ratesHiddenAddHint')}
          </AppText>
        )}
        {error ? (
          <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
            {error}
          </AppText>
        ) : null}
        <Button
          label={t('employees.sendInvitation')}
          icon="send"
          onPress={() => void submit()}
          disabled={!valid}
          loading={invite.isPending}
          testID="employee-submit"
        />
        <AppText variant="caption" tone="muted" align="center">
          {t('employees.untilAccepts', { name: name.trim() || t('employees.person') })}
        </AppText>
      </View>
    </AppSheet>
  );
});

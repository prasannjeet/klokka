import { useRef } from 'react';
import type { JobReminderLead, Language, ThemePreference } from '@klokka/api-client';
import { useMe, useUpdatePreferences } from '@/data/me';
import { useT } from '@/i18n/LocaleProvider';
import { useAppStore } from '@/store/appStore';
import { AppSwitch, Row, Separator, useToast, type SheetHandle } from '@/ui';
import { OptionSheet } from '@/ui/OptionSheet';
import { usePushPreference } from '@/features/push/usePush';

// The per-user preferences (CHQ-134, CHQ-139): push, weekly digest, language, appearance. Shared by
// the employee's Profile and the employer's Settings; each row saves as it changes.
export function NotificationPreferenceRows({ employer }: { employer: boolean }) {
  const t = useT();
  const toast = useToast();
  const { data: me } = useMe();
  const update = useUpdatePreferences();
  const push = usePushPreference();
  const prefs = me?.preferences;
  const onPush = async (value: boolean) => {
    try {
      await update.mutateAsync({ pushEnabled: value });
      await push.setEnabled(value);
    } catch {
      toast.show(t('errors.INTERNAL'), 'danger');
    }
  };
  return (
    <>
      <Row
        title={t('settings.push')}
        subtitle={employer ? t('settings.pushEmployerHint') : t('settings.pushShortHint')}
        trailing={
          <AppSwitch
            value={prefs?.pushEnabled ?? false}
            onValueChange={(v) => void onPush(v)}
            accessibilityLabel={t('settings.pushNotifications')}
            testID="pref-push"
          />
        }
      />
      <Separator />
      <Row
        title={t('settings.weeklyDigest')}
        subtitle={me?.user.email ? t('settings.digestTo', { email: me.user.email }) : undefined}
        trailing={
          <AppSwitch
            value={prefs?.digestEnabled ?? false}
            onValueChange={(v) =>
              update.mutate(
                { digestEnabled: v },
                { onError: () => toast.show(t('errors.INTERNAL'), 'danger') },
              )
            }
            accessibilityLabel={t('settings.weeklyDigestByEmail')}
            testID="pref-digest"
          />
        }
      />
    </>
  );
}

export function AppPreferenceRows() {
  const t = useT();
  const toast = useToast();
  const { data: me } = useMe();
  const update = useUpdatePreferences();
  const setLocale = useAppStore((s) => s.setLocalePreference);
  const setTheme = useAppStore((s) => s.setThemePreference);
  const languageSheet = useRef<SheetHandle>(null);
  const themeSheet = useRef<SheetHandle>(null);
  const language: Language = me?.preferences.language ?? 'en';
  const theme: ThemePreference = me?.preferences.theme ?? 'SYSTEM';
  const languageLabel = (l: Language) => (l === 'sv' ? t('settings.swedish') : t('settings.english'));
  const themeLabel = (v: ThemePreference) =>
    v === 'LIGHT' ? t('settings.light') : v === 'DARK' ? t('settings.dark') : t('settings.followDevice');
  return (
    <>
      <Row
        title={t('settings.language')}
        subtitle={t('settings.languageHint')}
        value={languageLabel(language)}
        onPress={() => languageSheet.current?.present()}
        testID="pref-language"
      />
      <Separator />
      <Row
        title={t('settings.appearance')}
        value={themeLabel(theme)}
        onPress={() => themeSheet.current?.present()}
        testID="pref-appearance"
      />
      <OptionSheet<Language>
        ref={languageSheet}
        title={t('settings.language')}
        subtitle={t('settings.languageHint')}
        closeLabel={t('common.close')}
        value={language}
        options={[
          { value: 'sv', label: t('settings.swedish') },
          { value: 'en', label: t('settings.english') },
        ]}
        onChange={(value) => {
          // The local mirror flips the UI at once; the server keeps it for push and email text.
          setLocale(value);
          update.mutate({ language: value }, { onError: () => toast.show(t('errors.INTERNAL'), 'danger') });
        }}
        testID="language-sheet"
      />
      <OptionSheet<ThemePreference>
        ref={themeSheet}
        title={t('settings.appearance')}
        closeLabel={t('common.close')}
        value={theme}
        options={[
          { value: 'SYSTEM', label: t('settings.followDevice') },
          { value: 'LIGHT', label: t('settings.light') },
          { value: 'DARK', label: t('settings.dark') },
        ]}
        onChange={(value) => {
          setTheme(value);
          update.mutate({ theme: value }, { onError: () => toast.show(t('errors.INTERNAL'), 'danger') });
        }}
        testID="appearance-sheet"
      />
    </>
  );
}

const LEADS: JobReminderLead[] = ['MINUTES_15', 'MINUTES_30', 'HOUR_1', 'HOURS_2', 'DAY_BEFORE'];

// Job reminders (CHQ-156): a push before each job with a start time, on by default an hour before. The
// person's own setting; the employer never sees it.
export function JobReminderRows() {
  const t = useT();
  const toast = useToast();
  const { data: me } = useMe();
  const update = useUpdatePreferences();
  const leadSheet = useRef<SheetHandle>(null);
  const on = me?.preferences.jobReminders ?? true;
  const lead: JobReminderLead = me?.preferences.jobReminderLead ?? 'HOUR_1';
  const leadLabel = (value: JobReminderLead) => t(`reminders.lead.${value}`);
  const save = (patch: { jobReminders?: boolean; jobReminderLead?: JobReminderLead }) =>
    update.mutate(patch, { onError: () => toast.show(t('errors.INTERNAL'), 'danger') });
  return (
    <>
      <Row
        title={t('reminders.toggle')}
        subtitle={on ? t('reminders.on', { lead: leadLabel(lead).toLocaleLowerCase() }) : t('reminders.off')}
        trailing={
          <AppSwitch
            value={on}
            onValueChange={(v) => save({ jobReminders: v })}
            accessibilityLabel={t('reminders.toggle')}
            testID="pref-reminders"
          />
        }
      />
      {on ? (
        <>
          <Separator />
          <Row
            title={t('reminders.howEarly')}
            value={leadLabel(lead)}
            onPress={() => leadSheet.current?.present()}
            testID="pref-reminder-lead"
          />
        </>
      ) : null}
      <OptionSheet<JobReminderLead>
        ref={leadSheet}
        title={t('reminders.howEarly')}
        subtitle={t('reminders.hint')}
        closeLabel={t('common.close')}
        value={lead}
        options={LEADS.map((value) => ({
          value,
          label: value === 'HOUR_1' ? `${leadLabel(value)} (${t('reminders.default')})` : leadLabel(value),
        }))}
        onChange={(value) => save({ jobReminderLead: value })}
        testID="reminder-lead-sheet"
      />
    </>
  );
}

'use client';

// The employee's job notifications: Job updates (CHQ-188, a notification when the employer adds, changes or removes
// one of their jobs, on by default) and job reminders (CHQ-156, a push before each job with a start time, this long
// before it). The employee's own preferences, the same in every workspace; the employer neither sees nor changes them.
import type { JobReminderLead } from '@klokka/api-client';
import { useT } from '@/lib/i18n';
import { useMe } from '@/lib/me';
import { ChoiceGroup } from '../choice-group';
import { Switch } from '../switch';
import { SavedMark } from './saved-mark';
import { usePreferenceSave, useSavedRow } from './use-save';

const LEADS: readonly JobReminderLead[] = ['MINUTES_15', 'MINUTES_30', 'HOUR_1', 'HOURS_2', 'DAY_BEFORE'];

export function JobNotificationPrefs() {
  const t = useT();
  const me = useMe();
  const [savedRow, markSaved] = useSavedRow();
  const save = usePreferenceSave(markSaved);
  const { jobReminders, jobReminderLead, jobUpdates } = me.preferences;
  const lead = t(`reminders.lead.${jobReminderLead}`);

  return (
    <section className="card sgroup" aria-labelledby="prefs-job-notifications">
      <h2 id="prefs-job-notifications">{t('settings.jobNotifications')}</h2>
      <div className="srow">
        <div>
          <b className="t t-line">
            {t('settings.jobUpdates')}
            <SavedMark show={savedRow === 'job-updates'} />
          </b>
          <p>{t('settings.jobUpdatesHint')}</p>
        </div>
        <Switch
          checked={jobUpdates}
          onChange={(on) => void save({ jobUpdates: on }, 'job-updates')}
          label={t('settings.jobUpdates')}
          hint={jobUpdates ? t('common.on') : t('common.off')}
        />
      </div>
      <div className="srow">
        <div>
          <b className="t t-line">
            {t('reminders.toggle')}
            <SavedMark show={savedRow === 'reminders'} />
          </b>
          <p>{t('reminders.hint')}</p>
        </div>
        <Switch
          checked={jobReminders}
          onChange={(on) => void save({ jobReminders: on }, 'reminders')}
          label={t('reminders.toggle')}
          hint={jobReminders ? t('reminders.on', { lead: lead.toLocaleLowerCase() }) : t('reminders.off')}
        />
      </div>
      <div className="srow">
        <div>
          <b className="t t-line" id="prefs-lead-l">
            {t('reminders.howEarly')}
            <SavedMark show={savedRow === 'lead'} />
          </b>
        </div>
        <ChoiceGroup<JobReminderLead>
          className="seg settings-seg wrap"
          labelledBy="prefs-lead-l"
          value={jobReminderLead}
          disabled={!jobReminders}
          onChange={(value) => void save({ jobReminderLead: value }, 'lead')}
          choices={LEADS.map((value) => ({
            value,
            label:
              value === 'HOUR_1'
                ? `${t(`reminders.lead.${value}`)} (${t('reminders.default')})`
                : t(`reminders.lead.${value}`),
          }))}
        />
      </div>
    </section>
  );
}

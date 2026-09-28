'use client';

// Push and the weekly digest (CHQ-134): the signed-in user's own preferences, the same in every workspace.
import { useT } from '@/lib/i18n';
import { useMe } from '@/lib/me';
import { Switch } from '../switch';
import { SavedMark } from './saved-mark';
import { usePreferenceSave, useSavedRow } from './use-save';

export function NotificationPrefs({ employer }: { employer: boolean }) {
  const t = useT();
  const me = useMe();
  const [savedRow, markSaved] = useSavedRow();
  const save = usePreferenceSave(markSaved);
  const { pushEnabled, digestEnabled } = me.preferences;

  return (
    <section className="card sgroup" aria-labelledby="prefs-notif">
      <h2 id="prefs-notif">{t('settings.notifications')}</h2>
      <div className="srow">
        <div>
          <b className="t t-line">
            {t('settings.push')}
            <SavedMark show={savedRow === 'push'} />
          </b>
          <p>{employer ? t('settings.pushEmployerHint') : t('settings.pushEmployeeHint')}</p>
        </div>
        <Switch
          checked={pushEnabled}
          onChange={(on) => void save({ pushEnabled: on }, 'push')}
          label={t('settings.pushNotifications')}
          hint={me.pushTokenRegistered ? t('settings.pushDevice') : t('web.settings.noDevice')}
        />
      </div>
      <div className="srow">
        <div>
          <b className="t t-line">
            {t('settings.weeklyDigest')}
            <SavedMark show={savedRow === 'digest'} />
          </b>
          <p>{t('settings.weeklyDigestHint')}</p>
        </div>
        <Switch
          checked={digestEnabled}
          onChange={(on) => void save({ digestEnabled: on }, 'digest')}
          label={t('settings.weeklyDigestByEmail')}
          hint={me.user.email ? t('settings.digestTo', { email: me.user.email }) : undefined}
        />
      </div>
    </section>
  );
}

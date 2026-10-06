'use client';

// Profile (CHQ-134 and CHQ-139, mockup web-employee.html "Profile"): one account for every workspace. Emoji
// avatar and name (PATCH /me), language applied to the whole app at once, appearance following the device
// or forced light or dark, push and digest, the workspaces, sign out, and deleting the account (CHQ-157). Changes
// save one at a time.
import Link from 'next/link';
import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { Language, ThemePreference } from '@klokka/api-client';
import { signOutAction } from '@/lib/auth-actions';
import { useLocale, useSetLocale, useT } from '@/lib/i18n';
import { useMe } from '@/lib/me';
import { applyMode, modeOfPreference } from '@/lib/mode';
import { AVATAR_EMOJIS, colourVar, initials } from '@/lib/visual';
import { useWorkspace } from '@/lib/workspace';
import { Avatar } from '../avatar';
import { ChoiceGroup } from '../choice-group';
import { DeleteAccountDialog } from './delete-account-dialog';
import { Icon } from '../icons';
import { roleLine } from '../shell/role-line';
import { ViewHeader } from '../view-header';
import { JobReminderPrefs } from './job-reminder-prefs';
import { NotificationPrefs } from './notification-prefs';
import { SavedMark } from './saved-mark';
import { usePreferenceSave, useProfileSave, useSavedRow } from './use-save';
import './settings.css';

const INITIAL = 'initial';

export function ProfileView() {
  const t = useT();
  const me = useMe();
  const ws = useWorkspace();
  const locale = useLocale();
  const setLocale = useSetLocale();
  const [savedRow, markSaved] = useSavedRow();
  const saveProfile = useProfileSave(markSaved);
  const savePreference = usePreferenceSave(markSaved);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const employerCount = me.workspaces.filter((w) => w.role === 'EMPLOYER').length;
  const employeeCount = me.workspaces.filter((w) => w.role === 'EMPLOYEE').length;
  const avatarValue = me.user.avatarEmoji ?? INITIAL;
  const name = nameDraft ?? me.user.name;

  function commitName() {
    if (nameDraft === null) return;
    const next = nameDraft.trim();
    if (!next) {
      setNameError(t('web.profile.nameRequired'));
      return;
    }
    setNameError(null);
    setNameDraft(null);
    if (next !== me.user.name) void saveProfile({ name: next }, 'name');
  }

  function onEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  // The whole app switches first (catalogue and <html lang>), then the preference is stored so push and
  // email follow; a refusal switches back.
  function changeLanguage(next: Language) {
    const previous = locale;
    if (next === previous) return;
    void savePreference({ language: next }, 'language', {
      apply: () => setLocale(next),
      rollback: () => setLocale(previous),
    });
  }

  function changeTheme(next: ThemePreference) {
    const previous = me.preferences.theme;
    void savePreference({ theme: next }, 'appearance', {
      apply: () => applyMode(modeOfPreference(next)),
      rollback: () => applyMode(modeOfPreference(previous)),
    });
  }

  return (
    <section className="view" aria-labelledby="h-profile">
      <ViewHeader id="h-profile" title={t('profile.title')} sub={t('profile.hint')} />

      <section className="card sgroup" aria-label={t('profile.title')}>
        <div className="pf-head">
          <Avatar name={me.user.name} emoji={me.user.avatarEmoji} index={1} size="xl" />
          <div>
            <b>{me.user.name}</b>
            {me.user.email ? <span>{me.user.email}</span> : null}
            {employerCount > 0 ? <span>{t('web.profile.employerAt', { count: employerCount })}</span> : null}
            {employeeCount > 0 ? (
              <span>{t('role.employeeAtWorkspaces', { count: employeeCount })}</span>
            ) : null}
          </div>
        </div>
        <div className="srow">
          <div>
            <b className="t t-line">
              {t('profile.avatar')}
              <SavedMark show={savedRow === 'avatar'} />
            </b>
            <p>{t('profile.avatarHint')}</p>
          </div>
          <div style={{ maxWidth: 440 }}>
            <ChoiceGroup
              className="emojis"
              label={t('profile.emojiAvatar')}
              value={avatarValue}
              onChange={(value) =>
                void saveProfile({ avatarEmoji: value === INITIAL ? null : value }, 'avatar')
              }
              choices={[
                { value: INITIAL, label: t('profile.initial'), content: initials(me.user.name) },
                ...AVATAR_EMOJIS.map(([emoji, key]) => ({
                  value: emoji,
                  label: t(`web.emoji.${key}`),
                  content: emoji,
                })),
              ]}
            />
          </div>
        </div>
        <div className="srow">
          <div>
            <b className="t t-line">
              {t('profile.name')}
              <SavedMark show={savedRow === 'name'} />
            </b>
            <p>{t('profile.nameHint')}</p>
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="pf-name">
              {t('profile.name')}
            </label>
            <input
              className="input"
              id="pf-name"
              value={name}
              maxLength={80}
              autoComplete="name"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? 'pf-name-err' : undefined}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={onEnter}
            />
            {nameError ? (
              <span className="err" id="pf-name-err">
                {nameError}
              </span>
            ) : null}
          </div>
        </div>
        <div className="srow">
          <div>
            <b className="t">{t('profile.email')}</b>
            <p>{t('profile.emailHint')}</p>
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="pf-email">
              {t('profile.email')}
            </label>
            <input className="input" id="pf-email" type="email" value={me.user.email ?? ''} readOnly />
          </div>
        </div>
        <div className="srow">
          <div>
            <b className="t t-line">
              {t('settings.language')}
              <SavedMark show={savedRow === 'language'} />
            </b>
            <p>{t('settings.languageHint')}</p>
          </div>
          <ChoiceGroup<Language>
            className="seg settings-seg"
            label={t('settings.language')}
            value={locale}
            onChange={changeLanguage}
            choices={[
              { value: 'sv', label: t('settings.swedish'), lang: 'sv' },
              { value: 'en', label: t('settings.english'), lang: 'en' },
            ]}
          />
        </div>
        <div className="srow">
          <div>
            <b className="t t-line">
              {t('settings.appearance')}
              <SavedMark show={savedRow === 'appearance'} />
            </b>
            <p>{t('web.profile.appearanceHint')}</p>
          </div>
          <ChoiceGroup<ThemePreference>
            className="seg settings-seg"
            label={t('settings.appearance')}
            value={me.preferences.theme}
            onChange={changeTheme}
            choices={[
              { value: 'SYSTEM', label: t('settings.followDevice') },
              { value: 'LIGHT', label: t('settings.light') },
              { value: 'DARK', label: t('settings.dark') },
            ]}
          />
        </div>
      </section>

      <div style={{ marginTop: 16 }}>
        <NotificationPrefs employer={ws.isEmployer} />
      </div>

      {ws.isEmployer ? null : (
        <div style={{ marginTop: 16 }}>
          <JobReminderPrefs />
        </div>
      )}

      <section className="card sgroup" aria-labelledby="pf-ws-h" style={{ marginTop: 16 }}>
        <h2 id="pf-ws-h">{t('profile.workspaces')}</h2>
        <div className="hgrid list pf-ws" style={{ marginTop: 12 }}>
          {me.workspaces.map((w) => (
            <div className="row" key={w.workspaceId}>
              <span
                className="ws-em"
                style={{ '--ws-color': colourVar(w.colour) } as CSSProperties}
                aria-hidden="true"
              >
                {w.emoji}
              </span>
              <div>
                <b>{w.name}</b>
                <span>
                  {w.role === 'EMPLOYER'
                    ? roleLine(t, w)
                    : `${w.employerName ? t('profile.employeeOf', { name: w.employerName }) : t('role.employee')} ${w.showPay ? t('profile.payShown') : t('profile.hoursOnly')}`}
                </span>
              </div>
              <Link
                className="btn btn-sm btn-ghost"
                href={`/w/${w.slug}`}
                aria-label={`${t('common.open')}: ${w.name}`}
              >
                {t('common.open')}
              </Link>
            </div>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          {t('profile.pastHoursHint')}
        </p>
      </section>

      <form action={signOutAction} className="pf-actions">
        <button className="btn btn-ghost" type="submit">
          <Icon name="logout" />
          {t('common.signOut')}
        </button>
      </form>

      <section className="card sgroup" aria-labelledby="pf-del-h" style={{ marginTop: 16 }}>
        <div className="srow">
          <div>
            <h2 id="pf-del-h" className="t">
              {t('account.delete.title')}
            </h2>
            <p>{t('account.delete.hint')}</p>
          </div>
          <button className="btn btn-danger" type="button" onClick={() => setDeleting(true)}>
            <Icon name="trash" />
            {t('account.delete.title')}
          </button>
        </div>
      </section>
      <DeleteAccountDialog me={me} open={deleting} onClose={() => setDeleting(false)} />
    </section>
  );
}

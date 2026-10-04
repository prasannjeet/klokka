'use client';

// Workspace settings (CHQ-127, mockup web-employer.html "Settings"): name, colour and emoji, time zone and
// week start, rounding and the default day, the show-pay switch with the currency, and the employer's own
// notification preferences. Each field saves on its own. The pay switch (CHQ-128) changes the whole app at
// once: every money figure is drawn through components/money.tsx, which reads showPay from /me.
import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { Rounding, Workspace } from '@klokka/api-client';
import { formatHours, parseHours } from '@klokka/core';
import { useLocale, useT } from '@/lib/i18n';
import { useMembers, useWorkspaceDetails } from '@/lib/queries';
import { monthIn } from '@/lib/time';
import { colourVar, firstName } from '@/lib/visual';
import { useWorkspace, type WorkspaceView } from '@/lib/workspace';
import { ChoiceGroup } from '../choice-group';
import { Money } from '../money';
import { Switch } from '../switch';
import { useToast } from '../toast';
import { ViewHeader } from '../view-header';
import {
  ColourPicker,
  CurrencySelect,
  EmojiPicker,
  TimezoneSelect,
  WeekStartPicker,
} from '../workspace-fields';
import { NotificationPrefs } from './notification-prefs';
import { SavedMark } from './saved-mark';
import { useSavedRow, useWorkspaceSave } from './use-save';
import './settings.css';

export function WorkspaceSettings() {
  const t = useT();
  const ws = useWorkspace();
  const details = useWorkspaceDetails(ws.id);

  return (
    <section className="view" aria-labelledby="h-settings">
      <ViewHeader id="h-settings" title={t('settings.title')} sub={t('settings.hint')} />
      {details.data ? (
        <SettingsGroups ws={ws} details={details.data} />
      ) : (
        <div className="card sgroup">
          <p className="muted">{details.isError ? t('errors.INTERNAL') : t('common.loading')}</p>
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <NotificationPrefs employer />
      </div>
      <p className="illustrative">{t('settings.savesPerField')}</p>
    </section>
  );
}

function onEnter(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === 'Enter') {
    event.preventDefault();
    event.currentTarget.blur();
  }
}

function SettingsGroups({ ws, details }: { ws: WorkspaceView; details: Workspace }) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const [savedRow, markSaved] = useSavedRow();
  const save = useWorkspaceSave(ws.id, markSaved);
  const members = useMembers(ws.id, monthIn(ws.timezone));

  // Drafts only while typing; the saved value shows otherwise.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [dayDraft, setDayDraft] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [dayError, setDayError] = useState<string | null>(null);

  const name = nameDraft ?? details.name;
  const day = dayDraft ?? formatHours(details.defaultDayHours, locale, { unit: false });

  function commitName() {
    if (nameDraft === null) return;
    const next = nameDraft.trim();
    if (!next) {
      setNameError(t('web.newWorkspace.nameRequired'));
      return;
    }
    setNameError(null);
    setNameDraft(null);
    if (next !== details.name) void save({ name: next }, { row: 'name' });
  }

  function commitDay() {
    if (dayDraft === null) return;
    const hours = parseHours(dayDraft);
    if (hours === null || hours < 0.25 || hours > 24) {
      setDayError(t('web.settings.dayLengthInvalid'));
      return;
    }
    setDayError(null);
    setDayDraft(null);
    if (hours !== details.defaultDayHours) void save({ defaultDayHours: hours }, { row: 'day' });
  }

  function setPay(on: boolean) {
    save(
      { showPay: on },
      {
        row: 'pay',
        onSuccess: () =>
          toast(
            on
              ? {
                  title: t('web.settings.payShownTitle'),
                  body: t('web.settings.payShownBody'),
                  icon: 'check',
                }
              : {
                  title: t('web.settings.payHiddenTitle'),
                  body: t('web.settings.payHiddenBody'),
                  icon: 'check',
                },
          ),
      },
    );
  }

  const example = (members.data ?? []).find(
    (m) => m.role === 'EMPLOYEE' && m.status === 'ACTIVE' && m.hourlyRate != null,
  );
  const preview = { '--ws-color': colourVar(details.colour) } as CSSProperties;

  return (
    <>
      <section className="card sgroup" aria-labelledby="s-ws">
        <h2 id="s-ws">{t('settings.workspace')}</h2>
        <div className="srow">
          <div>
            <b className="t t-line">
              {t('profile.name')}
              <SavedMark show={savedRow === 'name'} />
            </b>
            <p>{t('workspace.nameHint')}</p>
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="s-name">
              {t('workspace.name')}
            </label>
            <input
              className="input"
              id="s-name"
              value={name}
              maxLength={80}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? 's-name-err' : undefined}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={onEnter}
            />
            {nameError ? (
              <span className="err" id="s-name-err">
                {nameError}
              </span>
            ) : null}
          </div>
        </div>
        <div className="srow">
          <div>
            <b className="t t-line">
              {t('workspace.colourAndEmoji')}
              <SavedMark show={savedRow === 'look'} />
            </b>
            <p>{t('workspace.colourAndEmojiHint')}</p>
          </div>
          <div className="settings-stack">
            <span className="sr-only" id="s-colour-l">
              {t('workspace.colour')}
            </span>
            <ColourPicker
              value={details.colour}
              onChange={(colour) => void save({ colour }, { row: 'look' })}
              labelledBy="s-colour-l"
            />
            <span className="sr-only" id="s-emoji-l">
              {t('workspace.emoji')}
            </span>
            <div style={{ maxWidth: 400 }}>
              <EmojiPicker
                value={details.emoji}
                onChange={(emoji) => void save({ emoji }, { row: 'look' })}
                labelledBy="s-emoji-l"
              />
            </div>
            <div className="ws-preview" aria-hidden="true" style={preview}>
              <span className="ws-em">{details.emoji}</span>
              <div>
                <b>{details.name}</b>
                <span>{t('workspace.switcherPreview')}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="srow">
          <div>
            <b className="t t-line">
              {t('workspace.timezoneAndWeek')}
              <SavedMark show={savedRow === 'time'} />
            </b>
            <p>{t('workspace.timezoneHint')}</p>
          </div>
          <div className="two">
            <div className="field">
              <label htmlFor="s-tz">{t('workspace.timezone')}</label>
              <TimezoneSelect
                id="s-tz"
                value={details.timezone}
                onChange={(timezone) => void save({ timezone }, { row: 'time' })}
              />
            </div>
            <div className="field">
              <span className="l" id="s-week-l">
                {t('workspace.weekStartsOn')}
              </span>
              <WeekStartPicker
                value={details.weekStart}
                onChange={(weekStart) => void save({ weekStart }, { row: 'time' })}
                labelledBy="s-week-l"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card sgroup" aria-labelledby="s-hours">
        <h2 id="s-hours">{t('settings.hours')}</h2>
        <div className="srow">
          <div>
            <b className="t t-line" id="s-round-l">
              {t('settings.rounding')}
              <SavedMark show={savedRow === 'rounding'} />
            </b>
            <p>{t('settings.roundingHint')}</p>
          </div>
          <ChoiceGroup<Rounding>
            className="seg settings-seg"
            label={t('settings.roundingRule')}
            value={details.rounding}
            onChange={(rounding) => void save({ rounding }, { row: 'rounding' })}
            choices={[
              { value: 'NONE', label: t('settings.roundingNone') },
              { value: 'QUARTER', label: t('settings.roundingQuarter') },
              { value: 'HALF', label: t('settings.roundingHalf') },
            ]}
          />
        </div>
        <div className="srow">
          <div>
            <b className="t t-line">
              {t('settings.defaultDayLength')}
              <SavedMark show={savedRow === 'day'} />
            </b>
            <p>{t('settings.defaultDayLengthHint')}</p>
          </div>
          <div className="field">
            <div className="day-length">
              <label className="sr-only" htmlFor="s-day">
                {t('settings.defaultDayLengthLabel')}
              </label>
              <input
                className="input short"
                id="s-day"
                inputMode="decimal"
                value={day}
                aria-invalid={dayError ? true : undefined}
                aria-describedby={dayError ? 's-day-err' : undefined}
                onChange={(e) => setDayDraft(e.target.value)}
                onBlur={commitDay}
                onKeyDown={onEnter}
              />
              <span className="muted">{t('common.hours')}</span>
            </div>
            {dayError ? (
              <span className="err" id="s-day-err">
                {dayError}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="card sgroup" aria-labelledby="s-employees">
        <h2 id="s-employees">{t('settings.employees')}</h2>
        <div className="srow">
          <div>
            <b className="t t-line">
              {t('settings.notifyDeclined')}
              <SavedMark show={savedRow === 'declined'} />
            </b>
          </div>
          <Switch
            checked={details.notifyFlagDeclined}
            onChange={(on) => void save({ notifyFlagDeclined: on }, { row: 'declined' })}
            label={t('settings.notifyDeclined')}
            hint={
              details.notifyFlagDeclined ? t('settings.notifyDeclinedOn') : t('settings.notifyDeclinedOff')
            }
          />
        </div>
        <div className="srow">
          <div>
            <b className="t t-line">
              {t('settings.employeesSeeInsights')}
              <SavedMark show={savedRow === 'insights'} />
            </b>
          </div>
          <Switch
            checked={details.employeesSeeInsights}
            onChange={(on) => void save({ employeesSeeInsights: on }, { row: 'insights' })}
            label={t('settings.employeesSeeInsights')}
            hint={
              details.employeesSeeInsights
                ? t('settings.employeesSeeInsightsOn')
                : t('settings.employeesSeeInsightsOff')
            }
          />
        </div>
      </section>

      <section className="card sgroup" aria-labelledby="s-pay">
        <h2 id="s-pay">{t('settings.pay')}</h2>
        <div className="srow">
          <div>
            <b className="t t-line">
              {t('settings.showPay')}
              <SavedMark show={savedRow === 'pay'} />
            </b>
            <p>{t('settings.showPayHint')}</p>
          </div>
          <div>
            <Switch
              checked={details.showPay}
              onChange={setPay}
              label={t('settings.showPay')}
              hint={details.showPay ? t('settings.showPayOn') : t('settings.showPayOff')}
            />
            {example ? (
              <div className="pay-demo" aria-hidden="true">
                <div className="r">
                  <span>{t('web.settings.payDemoLabel', { name: firstName(example.displayName) })}</span>
                  <b>
                    {formatHours(details.defaultDayHours, locale)}{' '}
                    <Money
                      amount={(example.hourlyRate ?? 0) * details.defaultDayHours}
                      currency={details.currency}
                      showPay={details.showPay}
                    />
                  </b>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        {details.showPay ? (
          <div className="srow">
            <div>
              <b className="t t-line">
                {t('workspace.currency')}
                <SavedMark show={savedRow === 'currency'} />
              </b>
              <p>{t('workspace.currencyHint')}</p>
            </div>
            <div className="field">
              <label className="sr-only" htmlFor="s-cur">
                {t('workspace.currency')}
              </label>
              <div style={{ maxWidth: 280 }}>
                <CurrencySelect
                  id="s-cur"
                  value={details.currency}
                  onChange={(currency) => void save({ currency }, { row: 'currency' })}
                />
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}

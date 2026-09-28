'use client';

// Create a workspace (CHQ-112, mockup login.html "Create your workspace"): Klokka's own screen after the
// Logto sign-up, or "Create workspace" from the switcher. The creator becomes its employer. The first
// workspace also asks for the employer's own name: sign-up never does, and until then the profile name is
// the email's local part, which is what invitations and notifications would show (staging: "admin invited you").
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type CSSProperties, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { WeekStart, WorkspaceColour } from '@klokka/api-client';
import { BrandPanel } from '@/components/brand-panel';
import { Icon } from '@/components/icons';
import { useToast } from '@/components/toast';
import {
  ColourPicker,
  CountrySelect,
  CurrencySelect,
  EmojiPicker,
  TimezoneSelect,
  WeekStartPicker,
  weekStartLabel,
} from '@/components/workspace-fields';
import { api } from '@/lib/api';
import { useLocale, useT } from '@/lib/i18n';
import { meKey, useMe } from '@/lib/me';
import { fieldError, problemMessage, toProblem, type ProblemInfo } from '@/lib/problem';
import { COUNTRIES, countryName } from '@/lib/regions';
import { WORKSPACE_EMOJIS, colourVar } from '@/lib/visual';

// Sweden first: the owner's market (docs/PRODUCT_BRIEF.md). The same on the server and in the browser, so
// the first render hydrates cleanly.
const START_COUNTRY = 'SE';

export function NewWorkspace() {
  const t = useT();
  const locale = useLocale();
  const me = useMe();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const first = me.workspaces.length === 0;

  const [name, setName] = useState('');
  const [yourName, setYourName] = useState(me.user.name);
  const [yourNameMissing, setYourNameMissing] = useState(false);
  const [country, setCountry] = useState(START_COUNTRY);
  const [timezone, setTimezone] = useState(COUNTRIES[START_COUNTRY]?.timezone ?? 'Europe/Stockholm');
  const [currency, setCurrency] = useState(COUNTRIES[START_COUNTRY]?.currency ?? 'SEK');
  const [weekStart, setWeekStart] = useState<WeekStart>('MONDAY');
  const [colour, setColour] = useState<WorkspaceColour>('PRIMARY');
  const [emoji, setEmoji] = useState<string>(WORKSPACE_EMOJIS[0][0]);
  const [problem, setProblem] = useState<ProblemInfo | null>(null);
  const [nameMissing, setNameMissing] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      if (first && yourName.trim() !== me.user.name) {
        await api.me.updateMe({ userProfileUpdate: { name: yourName.trim() } });
      }
      return api.workspaces.createWorkspace({
        workspaceCreate: { name: name.trim(), country, timezone, currency, weekStart, colour, emoji },
      });
    },
    onSuccess: async (workspace) => {
      await queryClient.invalidateQueries({ queryKey: meKey });
      toast({ title: t('workspace.created'), body: workspace.name });
      router.push(`/w/${workspace.slug}`);
    },
    onError: async (error) => {
      const p = await toProblem(error);
      setProblem(p);
      if (p.errors.length === 0) toast({ title: problemMessage(t, p), tone: 'error' });
    },
  });

  function onCountry(code: string) {
    setCountry(code);
    const defaults = COUNTRIES[code];
    if (defaults) {
      setTimezone(defaults.timezone);
      setCurrency(defaults.currency);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const missingYourName = first && !yourName.trim();
    setYourNameMissing(missingYourName);
    if (!name.trim() || missingYourName) {
      setNameMissing(!name.trim());
      return;
    }
    setProblem(null);
    create.mutate();
  }

  const nameError =
    nameMissing && !name.trim() ? t('web.newWorkspace.nameRequired') : fieldError(problem, 'name');
  const yourNameError = yourNameMissing && !yourName.trim() ? t('workspace.yourNameRequired') : null;
  const preview = { '--ws-color': colourVar(colour) } as CSSProperties;

  return (
    <div className="auth-wrap">
      <BrandPanel>
        <p className="lead rise d1">{t('workspace.switcherPreview')}</p>
        <div className="ws-tile rise d1" style={preview}>
          <span className="em" aria-hidden="true">
            {emoji}
          </span>
          <div>
            <b>{name.trim() || t('workspace.namePlaceholder')}</b>
            <span>
              {t('workspace.summary', {
                city: countryName(country, locale),
                currency,
                weekStart: weekStartLabel(weekStart, locale),
              })}
            </span>
          </div>
        </div>
        <h1 className="rise d2">
          {t('web.newWorkspace.headlineA')}
          <br />
          <span className="accent">{t('web.newWorkspace.headlineB')}</span>
        </h1>
        <p className="lead rise d3">{t('workspace.colourAndEmojiHint')}</p>
      </BrandPanel>
      <main className="auth" id="main">
        <div className="auth-inner">
          <form className="card auth-card rise" onSubmit={submit} noValidate aria-labelledby="new-ws-title">
            {first ? (
              <div className="steps">
                <span>{t('workspace.createStep', { step: 2, total: 2 })}</span>
                <i className="on" />
                <i className="on" />
              </div>
            ) : null}
            <h2 id="new-ws-title">{t('workspace.createTitle')}</h2>
            <p className="sub">{t('workspace.createHint')}</p>
            {first ? (
              <div className="field">
                <label htmlFor="ws-you">
                  {t('workspace.yourName')} <span>{t('workspace.yourNameHint')}</span>
                </label>
                <input
                  className="input"
                  id="ws-you"
                  value={yourName}
                  maxLength={80}
                  autoComplete="name"
                  aria-invalid={yourNameError ? true : undefined}
                  aria-describedby={yourNameError ? 'ws-you-err' : undefined}
                  onChange={(e) => setYourName(e.target.value)}
                />
                {yourNameError ? (
                  <span className="err" id="ws-you-err">
                    {yourNameError}
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="field" style={first ? { marginTop: 12 } : undefined}>
              <label htmlFor="ws-name">{t('workspace.name')}</label>
              <input
                className="input"
                id="ws-name"
                value={name}
                maxLength={80}
                autoComplete="organization"
                placeholder={t('workspace.namePlaceholder')}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? 'ws-name-err' : undefined}
                onChange={(e) => setName(e.target.value)}
              />
              {nameError ? (
                <span className="err" id="ws-name-err">
                  {nameError}
                </span>
              ) : null}
            </div>
            <div className="two" style={{ marginTop: 18 }}>
              <div className="field">
                <label htmlFor="ws-country">{t('workspace.country')}</label>
                <CountrySelect id="ws-country" value={country} onChange={onCountry} />
              </div>
              <div className="field">
                <label htmlFor="ws-tz">{t('workspace.timezone')}</label>
                <TimezoneSelect id="ws-tz" value={timezone} onChange={setTimezone} />
              </div>
            </div>
            <div className="two" style={{ marginTop: 12 }}>
              <div className="field">
                <label htmlFor="ws-cur">
                  {t('workspace.currency')} <span>{t('web.newWorkspace.currencyNote')}</span>
                </label>
                <CurrencySelect id="ws-cur" value={currency} onChange={setCurrency} />
              </div>
              <div className="field">
                <span className="l" id="ws-week-l">
                  {t('workspace.weekStartsOn')}
                </span>
                <WeekStartPicker value={weekStart} onChange={setWeekStart} labelledBy="ws-week-l" />
              </div>
            </div>
            <div className="field">
              <span className="l" id="ws-col-l">
                {t('workspace.colour')}
              </span>
              <ColourPicker value={colour} onChange={setColour} labelledBy="ws-col-l" />
            </div>
            <div className="field">
              <span className="l" id="ws-em-l">
                {t('workspace.emoji')}
              </span>
              <EmojiPicker value={emoji} onChange={setEmoji} labelledBy="ws-em-l" />
            </div>
            <div className="form-actions">
              {!first ? (
                <Link className="btn btn-ghost btn-icon" href="/" aria-label={t('common.back')}>
                  <Icon name="arrow-left" />
                </Link>
              ) : null}
              <button className="btn btn-primary" type="submit" disabled={create.isPending}>
                {t('nav.createWorkspace')}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

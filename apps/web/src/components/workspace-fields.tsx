'use client';

// The workspace identity pickers shared by "Create workspace" (CHQ-112) and Settings (CHQ-127).
import type { CSSProperties } from 'react';
import type { WeekStart, WorkspaceColour } from '@klokka/api-client';
import { formatWeekday, isEuropeanTimeZone, timeZoneLabel, timeZoneOptions } from '@klokka/core';
import { useLocale, useT } from '@/lib/i18n';
import { CURRENCIES, currencyName, sortedCountries } from '@/lib/regions';
import { WORKSPACE_COLOURS, WORKSPACE_EMOJIS, colourVar } from '@/lib/visual';
import { ChoiceGroup } from './choice-group';

export function ColourPicker({
  value,
  onChange,
  labelledBy,
}: {
  value: WorkspaceColour;
  onChange: (c: WorkspaceColour) => void;
  labelledBy: string;
}) {
  const t = useT();
  return (
    <ChoiceGroup
      className="swatches"
      labelledBy={labelledBy}
      value={value}
      onChange={onChange}
      choices={WORKSPACE_COLOURS.map((c) => ({
        value: c,
        label: t(`web.colour.${c}`),
        content: null,
        style: { '--c': colourVar(c) } as CSSProperties,
      }))}
    />
  );
}

export function EmojiPicker({
  value,
  onChange,
  labelledBy,
}: {
  value: string;
  onChange: (e: string) => void;
  labelledBy: string;
}) {
  const t = useT();
  return (
    <ChoiceGroup
      className="emojis"
      labelledBy={labelledBy}
      value={value}
      onChange={onChange}
      choices={WORKSPACE_EMOJIS.map(([emoji, name]) => ({
        value: emoji,
        label: t(`web.emoji.${name}`),
        content: emoji,
      }))}
    />
  );
}

export function weekStartLabel(weekStart: WeekStart, locale: 'sv' | 'en'): string {
  return formatWeekday(weekStart === 'MONDAY' ? 0 : 6, locale, 'long');
}

export function WeekStartPicker({
  value,
  onChange,
  labelledBy,
}: {
  value: WeekStart;
  onChange: (w: WeekStart) => void;
  labelledBy: string;
}) {
  const t = useT();
  return (
    <ChoiceGroup
      className="seg block"
      labelledBy={labelledBy}
      value={value}
      onChange={onChange}
      choices={[
        { value: 'MONDAY', label: t('workspace.monday') },
        { value: 'SUNDAY', label: t('workspace.sunday') },
      ]}
    />
  );
}

export function CountrySelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (code: string) => void;
}) {
  const locale = useLocale();
  return (
    <select className="input" id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {sortedCountries(locale).map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

export function TimezoneSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (tz: string) => void;
}) {
  const t = useT();
  // Europe first, then the rest of the world (CHQ-145); the ids are data, shown as people read them.
  const zones = timeZoneOptions(value);
  const groups = [
    { label: t('workspace.timezoneEurope'), zones: zones.filter(isEuropeanTimeZone) },
    { label: t('workspace.timezoneWorld'), zones: zones.filter((z) => !isEuropeanTimeZone(z)) },
  ];
  return (
    <select className="input" id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {groups.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.zones.map((tz) => (
            <option key={tz} value={tz}>
              {timeZoneLabel(tz)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function CurrencySelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (c: string) => void;
}) {
  const locale = useLocale();
  const options: string[] = CURRENCIES.includes(value as (typeof CURRENCIES)[number])
    ? [...CURRENCIES]
    : [value, ...CURRENCIES];
  return (
    <select className="input" id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((c) => (
        <option key={c} value={c}>
          {c}, {currencyName(c, locale)}
        </option>
      ))}
    </select>
  );
}

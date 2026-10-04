'use client';

// Where a job is (CHQ-156): search an address or a place (Google Places through the API, one session per
// search so Google bills the search, not each key), pick a recent place, use where you are now, or no place.
// A Maps problem says so and the job still saves without a location.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { JobLocation, PlaceSuggestion } from '@klokka/api-client';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { problemMessage, toProblem } from '@/lib/problem';
import { Icon } from '../icons';
import { MapImage } from './map-image';
import './jobs.css';

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

export const placesKey = (workspaceId: string) => ['places', workspaceId] as const;

function newSession(): string {
  return crypto.randomUUID();
}

export function LocationPicker({
  workspaceId,
  value,
  onChange,
}: {
  workspaceId: string;
  value: JobLocation | null;
  onChange: (location: JobLocation | null) => void;
}) {
  const t = useT();
  const id = useId();
  const [editing, setEditing] = useState(value === null);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const session = useRef(newSession());

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const searching = debounced.length >= MIN_CHARS;
  const suggestions = useQuery({
    queryKey: [...placesKey(workspaceId), 'search', debounced],
    queryFn: () => api.places.autocompletePlaces({ workspaceId, input: debounced, session: session.current }),
    enabled: editing && searching,
    staleTime: 60_000,
    retry: false,
  });
  const recent = useQuery({
    queryKey: [...placesKey(workspaceId), 'recent'],
    queryFn: () => api.places.listRecentPlaces({ workspaceId }),
    enabled: editing,
    retry: false,
  });

  useEffect(() => {
    if (!suggestions.error) return;
    void toProblem(suggestions.error).then((p) => setError(problemMessage(t, p)));
  }, [suggestions.error, t]);

  function choose(location: JobLocation | null) {
    onChange(location);
    setEditing(location === null ? editing : false);
    setQuery('');
    setDebounced('');
    setActive(0);
    setError(null);
    session.current = newSession();
  }

  async function pickSuggestion(s: PlaceSuggestion) {
    try {
      const place = await api.places.getPlace({ workspaceId, placeId: s.placeId, session: session.current });
      choose(place);
    } catch (e) {
      setError(problemMessage(t, await toProblem(e)));
    }
  }

  function useHere() {
    if (!('geolocation' in navigator)) {
      setError(t('places.locationDenied'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const place = await api.places.reverseGeocode({
            workspaceId,
            latitude: Number(pos.coords.latitude.toFixed(5)),
            longitude: Number(pos.coords.longitude.toFixed(5)),
          });
          choose(place);
        } catch (e) {
          setError(problemMessage(t, await toProblem(e)));
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setError(t('places.locationDenied'));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  if (value && !editing) {
    return (
      <div className="loc-chosen">
        <MapImage workspaceId={workspaceId} location={value} width={440} height={130} />
        <div className="loc-row">
          <Icon name="pin" />
          <div>
            <b>{value.name}</b>
            {value.address ? <span>{value.address}</span> : null}
          </div>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing(true)}>
            {t('jobs.change')}
          </button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => choose(null)}>
            {t('jobs.noLocation')}
          </button>
        </div>
      </div>
    );
  }

  const list: PlaceSuggestion[] = searching ? (suggestions.data ?? []) : [];
  const listId = `${id}-list`;

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (list.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (i + 1) % list.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (i - 1 + list.length) % list.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const s = list[active];
      if (s) void pickSuggestion(s);
    }
  }

  return (
    <div className="loc-pick">
      <div className="loc-search">
        <Icon name="search" />
        <input
          className="input"
          type="search"
          role="combobox"
          aria-label={t('places.search')}
          aria-expanded={list.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={list.length > 0 ? `${id}-opt-${active}` : undefined}
          placeholder={t('places.search')}
          value={query}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setError(null);
          }}
          onKeyDown={onKeyDown}
          data-testid="place-search"
        />
      </div>
      {error ? (
        <p className="err" role="alert">
          {error}
        </p>
      ) : null}
      {searching ? (
        <>
          <ul className="loc-list" id={listId} role="listbox" aria-label={t('places.results')}>
            {list.map((s, i) => (
              <li
                key={s.placeId}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'on' : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void pickSuggestion(s)}
              >
                <Icon name="pin" />
                <span>
                  <b>{s.primaryText}</b>
                  {s.secondaryText ? <small>{s.secondaryText}</small> : null}
                </span>
              </li>
            ))}
          </ul>
          {suggestions.isSuccess && list.length === 0 ? (
            <p className="muted">{t('places.noResults')}</p>
          ) : null}
          <p className="loc-credit">{t('places.poweredBy')}</p>
        </>
      ) : (
        <div className="loc-list">
          <button className="loc-opt" type="button" onClick={useHere} disabled={locating}>
            <Icon name="target" />
            <span>
              <b>{t('places.useHere')}</b>
              <small>{t('places.useHereHint')}</small>
            </span>
          </button>
          {(recent.data ?? []).length > 0 ? <p className="loc-head">{t('places.recent')}</p> : null}
          {(recent.data ?? []).map((p) => (
            <button
              key={`${p.placeId ?? ''}-${p.name}-${p.latitude}`}
              className="loc-opt"
              type="button"
              onClick={() => choose(p)}
            >
              <Icon name="pin" />
              <span>
                <b>{p.name}</b>
                {p.address ? <small>{p.address}</small> : null}
              </span>
            </button>
          ))}
          {value ? (
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

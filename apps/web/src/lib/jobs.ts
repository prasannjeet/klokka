'use client';

// Jobs (CHQ-156) as the web shows them: a duration reads "7 h 15 min", a job with a start time shows its span
// "09:00 to 13:30", a place links to Google Maps for directions, and its picture comes from the API's map
// proxy (the Maps key never reaches the browser).
import { useEffect, useState } from 'react';
import type { Job, JobLocation } from '@klokka/api-client';
import { splitHours, type Translator } from '@klokka/core';
import { bffUrl } from './api';

// How far ahead the month views go, for planning jobs (CHQ-156).
export const PLAN_AHEAD_MONTHS = 12;

export function formatDuration(hours: number, t: Translator): string {
  const { hours: h, minutes: m } = splitHours(hours, 'NONE');
  if (m === 0) return t('common.hoursValue', { hours: h });
  if (h === 0) return t('common.durationM', { minutes: m });
  return t('common.durationHm', { hours: h, minutes: m });
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// "13:30" plus 4.5 h is "18:00"; past midnight wraps ("22:00" plus 3 h is "01:00").
export function endTime(startTime: string, hours: number): string {
  const [h = 0, m = 0] = startTime.split(':').map(Number);
  const total = (h * 60 + m + Math.round(hours * 60)) % (24 * 60);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function timeRange(job: Pick<Job, 'startTime' | 'hours'>, t: Translator): string | null {
  if (!job.startTime) return null;
  return t('jobs.timeRange', { from: job.startTime, to: endTime(job.startTime, job.hours) });
}

export function directionsUrl(location: JobLocation): string {
  const params = new URLSearchParams({ api: '1', query: `${location.latitude},${location.longitude}` });
  if (location.placeId) params.set('query_place_id', location.placeId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function mapImageUrl(
  workspaceId: string,
  location: Pick<JobLocation, 'latitude' | 'longitude'>,
  width: number,
  height: number,
  dark: boolean,
): string {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    width: String(Math.round(width)),
    height: String(Math.round(height)),
    dark: String(dark),
  });
  return bffUrl(`workspaces/${workspaceId}/map.png?${params.toString()}`);
}

function isDark(): boolean {
  const mode = document.documentElement.dataset.mode;
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// The resolved theme (the user's choice in <html data-mode>, else the device), for the map's palette.
export function useDarkMode(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const update = () => setDark(isDark());
    update();
    const media =
      typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    media?.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
    return () => {
      media?.removeEventListener('change', update);
      observer.disconnect();
    };
  }, []);
  return dark;
}

// Place names of a day's jobs, in order, without repeats ("Café Nord, Lager").
export function placesOf(jobs: readonly Job[]): string[] {
  return [...new Set(jobs.map((j) => j.location?.name).filter((n): n is string => Boolean(n)))];
}

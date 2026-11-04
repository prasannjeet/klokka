// Usage analytics in the web app through Umami (CHQ-201): page views and three product events, the same names
// and cleaned paths as the phone app (@klokka/core). Umami's script sets no cookie and stores nothing in the
// browser; auto-tracking is off so the raw URL (business slug, ids, invitation token) never leaves the page.
// Every hit goes through `track` below, which reports the cleaned path and only the referrer's origin.

import { analyticsPath, type AnalyticsEvent } from '@klokka/core';

interface UmamiPayload {
  url?: string;
  title?: string;
  referrer?: string;
  name?: string;
  [key: string]: unknown;
}

interface UmamiTracker {
  track: (payload: (props: UmamiPayload) => UmamiPayload) => void;
}

type UmamiWindow = Window & { umami?: UmamiTracker };

// Hits made before the script loaded (the first page view, mostly) wait here and go out from `flushAnalytics`.
const queue: Array<(umami: UmamiTracker) => void> = [];

function run(hit: (umami: UmamiTracker) => void) {
  if (typeof window === 'undefined') return;
  const umami = (window as UmamiWindow).umami;
  if (umami) hit(umami);
  else queue.push(hit);
}

/** Called by the script's onLoad: sends what waited. A page without the script never flushes (no analytics). */
export function flushAnalytics() {
  const umami = (window as UmamiWindow).umami;
  if (!umami) return;
  for (const hit of queue.splice(0)) hit(umami);
}

/** The payload Umami builds, with the path cleaned and the referrer cut to its origin. Pure for the tests. */
export function cleanPayload(props: UmamiPayload, pathname: string, referrer: string, name?: AnalyticsEvent) {
  const url = analyticsPath(pathname);
  let origin = '';
  try {
    origin = referrer ? new URL(referrer).origin : '';
  } catch {
    origin = '';
  }
  return { ...props, url, title: url, referrer: origin, ...(name ? { name } : {}) };
}

function track(name?: AnalyticsEvent) {
  const pathname = window.location.pathname;
  const referrer = document.referrer;
  run((umami) => umami.track((props) => cleanPayload(props, pathname, referrer, name)));
}

let lastPage: string | null = null;

/** A page view, once per change of the cleaned path. */
export function trackPage(pathname: string) {
  const path = analyticsPath(pathname);
  if (path === lastPage) return;
  lastPage = path;
  track();
}

/** One of the product events, attributed to the page it happened on. */
export function trackEvent(name: AnalyticsEvent) {
  track(name);
}

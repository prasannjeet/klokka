// Usage analytics for the phone app through Umami (CHQ-201): the screens people open and three product events,
// the same names and paths as the web app (@klokka/core). Cookieless by design: nothing is stored on the phone,
// no device or install id is sent, and Umami derives its session from the request itself. A build without
// EXPO_PUBLIC_UMAMI_URL and EXPO_PUBLIC_UMAMI_WEBSITE_ID sends nothing (forks, local loops, tests).
//
// Umami's /api/send ignores a request without a browser-like User-Agent, so the app sends one that names the
// OS and the app; Umami's parser reads Android or iOS and "Mobile" from it.

import { analyticsPath, type AnalyticsEvent } from '@klokka/core';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Dimensions, Platform } from 'react-native';
import type { AnalyticsTarget } from '@/config';

/** Every hit names this hostname; the website id (staging or production) tells the environments apart. */
export const ANALYTICS_HOSTNAME = 'se.klokka.app';

export interface HitContext {
  userAgent: string;
  language: string;
  screen: string;
}

export type Hit = { kind: 'screen'; path: string } | { kind: 'event'; name: AnalyticsEvent; path: string };

/** The request Umami's collect endpoint expects. Pure so the payload is pinned by a test. */
export function umamiRequest(
  target: AnalyticsTarget,
  context: HitContext,
  hit: Hit,
): { url: string; init: RequestInit } {
  const url = analyticsPath(hit.path);
  const payload = {
    website: target.websiteId,
    hostname: ANALYTICS_HOSTNAME,
    language: context.language,
    screen: context.screen,
    url,
    title: url,
    referrer: '',
    ...(hit.kind === 'event' ? { name: hit.name } : {}),
  };
  return {
    url: `${target.url}/api/send`,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': context.userAgent },
      body: JSON.stringify({ type: 'event', payload }),
    },
  };
}

export function userAgent(
  os: string,
  osVersion: string | number,
  model: string | null,
  appVersion: string,
): string {
  const device = model ? `; ${model}` : '';
  return os === 'ios'
    ? `Mozilla/5.0 (iPhone; CPU iPhone OS ${String(osVersion).replace(/\./g, '_')} like Mac OS X) Mobile Klokka/${appVersion}`
    : `Mozilla/5.0 (Linux; Android ${osVersion}${device}) Mobile Klokka/${appVersion}`;
}

function context(language: string): HitContext {
  const { width, height } = Dimensions.get('screen');
  return {
    // Device.osVersion is the marketing version ("14"); Platform.Version on Android is the API level (34).
    userAgent: userAgent(
      Platform.OS,
      Device.osVersion ?? Platform.Version,
      Device.modelName,
      Constants.expoConfig?.version ?? '0.0.0',
    ),
    language,
    screen: `${Math.round(width)}x${Math.round(height)}`,
  };
}

let target: AnalyticsTarget | null = null;
let language = 'sv';
let lastScreen: string | null = null;

/** Called once from the root layout with the resolved config; null turns every call below into a no-op. */
export function configureAnalytics(next: AnalyticsTarget | null) {
  target = next;
}

/** The app's language, kept current by the root layout so hits carry what the user reads. */
export function setAnalyticsLanguage(next: string) {
  language = next;
}

function send(hit: Hit) {
  if (!target) return;
  const request = umamiRequest(target, context(language), hit);
  // Analytics must never get in the way of the app: a failed hit is dropped, not retried or surfaced.
  fetch(request.url, request.init).catch((error: unknown) => {
    if (__DEV__) console.warn('analytics hit failed', error);
  });
}

/** A screen view, once per change of the cleaned path (a re-render of the same screen is not a new view). */
export function trackScreen(pathname: string) {
  const path = analyticsPath(pathname);
  if (path === lastScreen) return;
  lastScreen = path;
  send({ kind: 'screen', path });
}

/** One of the product events, attributed to the screen it happened on. */
export function trackEvent(name: AnalyticsEvent) {
  send({ kind: 'event', name, path: lastScreen ?? '/' });
}

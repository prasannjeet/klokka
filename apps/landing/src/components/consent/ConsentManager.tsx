'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Mark } from '@/components/ui/Icon';
import {
  classifyClick,
  OPEN_CONSENT_EVENT,
  placementOf,
  readConsent,
  writeConsent,
  type ConsentChoice,
} from '@/lib/analytics';
import type { Dictionary } from '@/lib/i18n';

type Copy = Dictionary['consent'];

type DataLayerWindow = Window & { dataLayer?: unknown[] };

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    // Blocked storage (private mode, strict settings): the banner then asks on every page view.
    return null;
  }
}

/**
 * Google Consent Mode v2 defaults, then GTM itself. Runs only after the visitor said yes, so nothing reaches
 * Google before that ("basic" consent mode); ads signals stay denied because the site runs no ads.
 */
function loadTagManager(gtmId: string) {
  const w = window as DataLayerWindow;
  if (document.getElementById('gtm-script')) return;
  const dataLayer = (w.dataLayer = w.dataLayer ?? []);
  // GTM reads a consent command only as an Arguments object (what gtag() pushes), never as an array.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    dataLayer.push(arguments);
  }
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
  });
  dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const script = document.createElement('script');
  script.id = 'gtm-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  document.head.appendChild(script);
}

/** Google Analytics' own cookies (_ga, _ga_<id>), on this host and on its parent domain where GA puts them. */
function clearAnalyticsCookies() {
  const host = window.location.hostname;
  const domains = ['', host, `.${host.split('.').slice(-2).join('.')}`];
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (!name || !/^_ga(_|$)/.test(name)) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
    }
  }
}

// The stored answer as an external store: localStorage is the source of truth, read after hydration (the server
// and the first client render see 'pending', so no banner flashes for someone who already answered).
type Snapshot = ConsentChoice | 'unset' | 'pending';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function snapshot(): Snapshot {
  const s = storage();
  return (s && readConsent(s)) ?? 'unset';
}

const serverSnapshot = (): Snapshot => 'pending';

/**
 * The cookie question, asked once per browser, and everything that depends on the answer: GTM after a yes, the
 * site's click events while the answer stays yes. "Cookie settings" in the footer opens the question again; a
 * no after an earlier yes removes Google's cookies and reloads, since a loaded GTM cannot be unloaded.
 */
export function ConsentManager({
  gtmId,
  copy,
  privacyHref,
  appUrl,
}: {
  gtmId: string;
  copy: Copy;
  privacyHref: string;
  appUrl: string;
}) {
  const choice = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  // Answered with storage blocked: the answer lasts for this page view.
  const [unsaved, setUnsaved] = useState<ConsentChoice | null>(null);
  const [reopened, setReopened] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const effective = unsaved ?? choice;
  const open = reopened || effective === 'unset';

  useEffect(() => {
    if (effective === 'granted') loadTagManager(gtmId);
  }, [effective, gtmId]);

  useEffect(() => {
    const reopen = () => setReopened(true);
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  // Reopened from the footer: move focus to the question, as the visitor asked for it. The first, unasked
  // showing leaves focus where it is so the banner never interrupts keyboard or screen reader users.
  useEffect(() => {
    if (reopened) titleRef.current?.focus();
  }, [reopened]);

  useEffect(() => {
    if (effective !== 'granted') return;
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!(link instanceof HTMLAnchorElement)) return;
      const name = classifyClick({ href: link.href, track: link.dataset.track }, appUrl);
      if (!name) return;
      const w = window as DataLayerWindow;
      w.dataLayer = w.dataLayer ?? [];
      w.dataLayer.push({ event: name, placement: placementOf(link) });
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, [effective, appUrl]);

  function decide(next: ConsentChoice) {
    const wasGranted = effective === 'granted';
    const s = storage();
    if (s) {
      writeConsent(s, next, new Date());
      listeners.forEach((listener) => listener());
    } else {
      setUnsaved(next);
    }
    setReopened(false);
    if (next === 'denied' && wasGranted) {
      clearAnalyticsCookies();
      window.location.reload();
    }
  }

  if (!open) return null;

  return (
    <section className="consent" aria-labelledby="consent-title">
      <div className="consent-head">
        <Mark className="consent-mark" />
        <h2 className="consent-title" id="consent-title" ref={titleRef} tabIndex={-1}>
          {copy.title}
        </h2>
        <button type="button" className="consent-decline" onClick={() => decide('denied')}>
          {copy.decline}
        </button>
      </div>
      <p className="consent-body">
        {copy.body}{' '}
        <a className="consent-link" href={privacyHref}>
          {copy.privacy}
        </a>
      </p>
      <button
        type="button"
        className="btn btn-secondary btn-sm consent-accept"
        onClick={() => decide('granted')}
      >
        {copy.accept}
      </button>
    </section>
  );
}

/** "Cookie settings" in the footer: opens the question again. Rendered only on a build with a container id. */
export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="foot-button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
    >
      {label}
    </button>
  );
}

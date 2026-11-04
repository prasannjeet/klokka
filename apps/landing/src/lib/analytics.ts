// Google Analytics on the public site, through Google Tag Manager, only after the visitor accepts (CHQ-201).
// The container id is a build argument like the site's URLs (Dockerfile, .github/scripts/image.sh): unset means
// no banner and no Google request at all, so a fork or a self-hosted build never reports to Klokka's container.
// One container serves every build: a lookup on the page's hostname in GTM sends klokka.se to the production
// property and any other host (staging) to the staging property.

const GTM_ID_PATTERN = /^GTM-[A-Z0-9]{4,12}$/;

/** Pure so the fail-fast rule is pinned by a test: absent may be null, present-but-wrong fails the build. */
export function resolveGtmId(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (!GTM_ID_PATTERN.test(value)) {
    throw new Error(`NEXT_PUBLIC_GTM_ID must look like GTM-XXXXXXX, got "${value}"`);
  }
  return value;
}

export const gtmId: string | null = resolveGtmId(process.env.NEXT_PUBLIC_GTM_ID);

/**
 * What the Content-Security-Policy must also allow once GTM may load (Google's list for GTM with a GA4 Google
 * tag). Added only to a build with a container id; without one the policy stays 'self'.
 */
export const analyticsCsp = {
  script: ['https://www.googletagmanager.com'],
  connect: [
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://*.googletagmanager.com',
  ],
  img: ['https://*.google-analytics.com', 'https://*.googletagmanager.com'],
} as const;

/** The visitor's answer, in localStorage next to the light/dark choice. Versioned so a new question asks again. */
export const CONSENT_KEY = 'klokka-consent';
const CONSENT_VERSION = 1;

export type ConsentChoice = 'granted' | 'denied';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function readConsent(storage: Store): ConsentChoice | null {
  const raw = storage.getItem(CONSENT_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'v' in parsed &&
      'choice' in parsed &&
      parsed.v === CONSENT_VERSION &&
      (parsed.choice === 'granted' || parsed.choice === 'denied')
    ) {
      return parsed.choice;
    }
  } catch {
    // A value this code did not write: ask again.
  }
  return null;
}

export function writeConsent(storage: Store, choice: ConsentChoice, now: Date): void {
  storage.setItem(CONSENT_KEY, JSON.stringify({ v: CONSENT_VERSION, choice, at: now.toISOString() }));
}

/** Dispatched on window by "Cookie settings" in the footer; the consent manager opens its banner again. */
export const OPEN_CONSENT_EVENT = 'klokka:open-consent';

/** The events the GTM trigger listens for (its regex lists exactly these). */
export const SITE_EVENTS = ['sign_up_click', 'login_click', 'apk_download', 'template_download'] as const;
export type SiteEvent = (typeof SITE_EVENTS)[number];

export interface ClickTarget {
  /** The link's resolved absolute URL (HTMLAnchorElement.href). */
  href: string;
  /** `data-track` on the link: says which of two links to the same address this is (login vs sign-up). */
  track: string | undefined;
}

/**
 * Which site event a click on a link is, or null. Links into the web app are a sign-up unless marked
 * `data-track="login_click"`; the APK goes through /download/android; templates are files under /downloads/.
 */
export function classifyClick(target: ClickTarget, appUrl: string): SiteEvent | null {
  const marked = SITE_EVENTS.find((event) => event === target.track);
  if (marked) return marked;
  let url: URL;
  try {
    url = new URL(target.href);
  } catch {
    return null;
  }
  if (url.origin === new URL(appUrl).origin) return 'sign_up_click';
  if (url.pathname === '/download/android') return 'apk_download';
  if (url.pathname.startsWith('/downloads/')) return 'template_download';
  return null;
}

/**
 * Where on the page the click happened: the nav (bar or burger menu), the footer, the homepage hero, a subpage's
 * closing call to action, or the id of the homepage section around the link.
 */
export function placementOf(link: Element): string {
  if (link.closest('nav.nav, .menu')) return 'nav';
  if (link.closest('footer')) return 'footer';
  if (link.closest('.hero')) return 'hero';
  if (link.closest('.cta-page')) return 'cta';
  return link.closest('section[id]')?.id ?? 'page';
}

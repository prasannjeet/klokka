// Every address the site links to or prints. NEXT_PUBLIC_* values are inlined at BUILD time, which is why the
// Dockerfile takes them as build args; the defaults are the staging addresses (docs/DECISIONS.md D14).

function origin(value: string | undefined, fallback: string): string {
  return (value && value.trim() !== '' ? value : fallback).replace(/\/$/, '');
}

/** This site: canonical URLs, hreflang, sitemap, og:url. */
export const siteUrl = origin(process.env.NEXT_PUBLIC_SITE_URL, 'https://klokka.coolify.ooguy.com');

/** The web app: sign-up ("Create your business") and sign-in ("Log in"). */
export const appUrl = origin(process.env.NEXT_PUBLIC_APP_URL, 'https://klokka-app.coolify.ooguy.com');

/**
 * The signed Android release APK, published to Nexus (raw) by CI (docs/DECISIONS.md D4, D13). Only
 * next.config.ts uses it, as the target of the /download/android redirect.
 */
export const apkSourceUrl =
  process.env.NEXT_PUBLIC_APK_URL && process.env.NEXT_PUBLIC_APK_URL.trim() !== ''
    ? process.env.NEXT_PUBLIC_APK_URL
    : 'https://nexus.coolify.ooguy.com/repository/klokka-downloads/klokka-latest.apk';

/** What the site links to for the APK: a klokka.se address that redirects (307) to `apkSourceUrl`. */
export const apkUrl = `${siteUrl}/download/android`;

/**
 * Whether search engines may index this build. Only the literal 'true' turns it on (release.yml sets it for the
 * production image); absent or anything else is false, so an unconfigured build, staging included, stays out of
 * the index.
 */
export const indexable: boolean = process.env.NEXT_PUBLIC_INDEXABLE === 'true';

/** The public contact: a role address, never a person's name (about, privacy, terms, Organization JSON-LD). */
export const contactEmail = 'hej@klokka.se';

export const repoUrl = 'https://github.com/prasannjeet/klokka';
export const repoHost = 'github.com/prasannjeet/klokka';
export const cloneCommand = `git clone ${repoUrl}`;
export const licenseUrl = `${repoUrl}/blob/main/LICENSE`;
export const issuesUrl = `${repoUrl}/issues`;

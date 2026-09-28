import type { NotificationLink } from '@klokka/api-client';

// Where a notification takes the user when tapped. The API sends `data.url` as an app path such as
// `/w/<workspaceId>/month/2026-09`; the path is checked against this allowlist of route shapes before
// it is followed, and the workspace id switches the workspace first (docs/research/mobile.md 3).
export interface NotificationTarget {
  workspaceId: string | null;
  // An expo-router href inside the app.
  href: string;
}

const UUID = '[0-9a-fA-F-]{8,36}';
const MONTH = '\\d{4}-\\d{2}';
const DATE = '\\d{4}-\\d{2}-\\d{2}';

const SHAPES: { pattern: RegExp; href: (m: RegExpMatchArray) => string }[] = [
  { pattern: new RegExp(`^/w/(${UUID})/month/(${MONTH})$`), href: (m) => `/(tabs)/month?month=${m[2]}` },
  {
    pattern: new RegExp(`^/w/(${UUID})/members/(${UUID})/month/(${MONTH})$`),
    href: (m) => `/member/${m[2]}?month=${m[3]}`,
  },
  {
    pattern: new RegExp(`^/w/(${UUID})/members/(${UUID})/day/(${DATE})$`),
    href: (m) => `/day/${m[2]}/${m[3]}`,
  },
  { pattern: new RegExp(`^/w/(${UUID})/flags/(${UUID})$`), href: (m) => `/flag/${m[2]}` },
  { pattern: new RegExp(`^/w/(${UUID})/notifications$`), href: () => `/(tabs)/notifications` },
  { pattern: new RegExp(`^/w/(${UUID})/employees$`), href: () => `/employees` },
  { pattern: new RegExp(`^/w/(${UUID})$`), href: () => `/` },
  { pattern: /^\/notifications$/, href: () => `/(tabs)/notifications` },
];

export function parseNotificationUrl(url: unknown): NotificationTarget | null {
  if (typeof url !== 'string') return null;
  const path = url
    .replace(/^klokka:\/\//, '/')
    .replace(/^\/+/, '/')
    .split('?')[0] as string;
  for (const shape of SHAPES) {
    const m = path.match(shape.pattern);
    if (m) return { workspaceId: path.startsWith('/w/') ? (m[1] as string) : null, href: shape.href(m) };
  }
  return null;
}

// The same decision for an in-app notification row, from its structured `link`.
export function targetForLink(
  link: NotificationLink,
  role: 'EMPLOYER' | 'EMPLOYEE',
  selfMembershipId: string | null,
): NotificationTarget | null {
  const workspaceId = link.workspaceId ?? null;
  if (link.flagId && role === 'EMPLOYER') return { workspaceId, href: `/flag/${link.flagId}` };
  if (link.membershipId && link.date) {
    const iso = `${link.date.getFullYear()}-${String(link.date.getMonth() + 1).padStart(2, '0')}-${String(link.date.getDate()).padStart(2, '0')}`;
    return { workspaceId, href: `/day/${link.membershipId}/${iso}` };
  }
  if (link.membershipId && link.month) {
    if (role === 'EMPLOYEE' && link.membershipId === selfMembershipId)
      return { workspaceId, href: `/(tabs)/month?month=${link.month}` };
    return { workspaceId, href: `/member/${link.membershipId}?month=${link.month}` };
  }
  if (link.month)
    return {
      workspaceId,
      href:
        role === 'EMPLOYER' ? `/(tabs)/insights?month=${link.month}` : `/(tabs)/month?month=${link.month}`,
    };
  if (link.membershipId && role === 'EMPLOYER') return { workspaceId, href: `/member/${link.membershipId}` };
  if (workspaceId) return { workspaceId, href: '/' };
  return null;
}

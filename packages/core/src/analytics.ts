// Usage analytics shared by the web app and the phone app (CHQ-201): the same event names and the same
// cleaned-up paths on both, so one Umami report compares them. Nothing here talks to a network; each client
// sends through its own transport (the Umami script on the web, Umami's /api/send from the phone).

/** The few product events both clients report, and nothing else: no ids, no names, no amounts. */
export const ANALYTICS_EVENTS = {
  workspaceCreated: 'workspace_created',
  invitationSent: 'invitation_sent',
  hoursSaved: 'hours_saved',
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;
const WORD = /^[a-z][a-z-]*$/;

/**
 * A route as a pattern, safe to report: the query and hash are dropped (an invitation token rides there), the
 * business slug after /w/ becomes :workspace, ids become :id, dates :date and months :month, and any other
 * segment that is not a plain lowercase word becomes :id. `/w/cafe-nord/jobs/<uuid>?tab=x` is
 * `/w/:workspace/jobs/:id`; `/day/<uuid>/2026-11-04` is `/day/:id/:date`.
 */
export function analyticsPath(path: string): string {
  const bare = path.split(/[?#]/, 1)[0] ?? '';
  const segments = bare.split('/').filter((segment) => segment !== '');
  const cleaned = segments.map((segment, index) => {
    if (index > 0 && segments[index - 1] === 'w') return ':workspace';
    if (UUID.test(segment)) return ':id';
    if (DATE.test(segment)) return ':date';
    if (MONTH.test(segment)) return ':month';
    return WORD.test(segment) ? segment : ':id';
  });
  return `/${cleaned.join('/')}`;
}

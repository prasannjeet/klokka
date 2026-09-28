import { parseNotificationUrl, targetForLink } from './notificationLinks';

const ws = '2b1f7e0a-4c8d-4d5e-9a6b-3c2d1e0f9a8b';
const mem = '5f1d2a3c-9b7e-4c1a-8d2f-6e4b1a0c9d21';

describe('parseNotificationUrl', () => {
  it('maps the allowlisted shapes to routes and switches the workspace first', () => {
    expect(parseNotificationUrl(`/w/${ws}/month/2026-09`)).toEqual({
      workspaceId: ws,
      href: '/(tabs)/month?month=2026-09',
    });
    expect(parseNotificationUrl(`klokka://w/${ws}/members/${mem}/day/2026-09-23`)).toEqual({
      workspaceId: ws,
      href: `/day/${mem}/2026-09-23`,
    });
    expect(parseNotificationUrl(`/w/${ws}/flags/${mem}`)).toEqual({ workspaceId: ws, href: `/flag/${mem}` });
    expect(parseNotificationUrl(`/w/${ws}/notifications?x=1`)).toEqual({
      workspaceId: ws,
      href: '/(tabs)/notifications',
    });
    expect(parseNotificationUrl('/notifications')).toEqual({
      workspaceId: null,
      href: '/(tabs)/notifications',
    });
  });

  it('refuses anything outside the allowlist', () => {
    expect(parseNotificationUrl('https://evil.example/phish')).toBeNull();
    expect(parseNotificationUrl(`/w/${ws}/settings`)).toBeNull();
    expect(parseNotificationUrl('/w/not-a-uuid!/month/2026-09')).toBeNull();
    expect(parseNotificationUrl(42)).toBeNull();
    expect(parseNotificationUrl(undefined)).toBeNull();
  });
});

describe('targetForLink', () => {
  const date = new Date(2026, 8, 23);
  it('sends the employer to the flag and the employee to their own month', () => {
    expect(targetForLink({ workspaceId: ws, flagId: 'f1' }, 'EMPLOYER', null)).toEqual({
      workspaceId: ws,
      href: '/flag/f1',
    });
    expect(targetForLink({ workspaceId: ws, membershipId: mem, month: '2026-09' }, 'EMPLOYEE', mem)).toEqual({
      workspaceId: ws,
      href: '/(tabs)/month?month=2026-09',
    });
    expect(targetForLink({ workspaceId: ws, membershipId: mem, month: '2026-09' }, 'EMPLOYER', null)).toEqual(
      { workspaceId: ws, href: `/member/${mem}?month=2026-09` },
    );
    expect(targetForLink({ workspaceId: ws, membershipId: mem, date }, 'EMPLOYEE', mem)).toEqual({
      workspaceId: ws,
      href: `/day/${mem}/2026-09-23`,
    });
    expect(targetForLink({}, 'EMPLOYEE', null)).toBeNull();
  });
});

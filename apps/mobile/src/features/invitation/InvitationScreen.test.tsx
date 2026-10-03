import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ResponseError } from '@klokka/api-client';
import { InvitationScreen } from './InvitationScreen';
import { fakeApi, meFixture, renderApp } from '@/testing/render';
import { routerState } from '@/testing/nativeMocks';
import { useAppStore } from '@/store/appStore';

const invitation = {
  workspaceName: 'Nordlys Cafe',
  workspaceEmoji: '🥐',
  workspaceColour: 'YELLOW' as const,
  inviterName: 'Elin Berg',
  email: 'maria.lind@example.com',
  role: 'EMPLOYEE' as const,
  status: 'PENDING' as const,
  // Relative to now: a fixed date made this test fail once the calendar passed it.
  expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  language: 'en' as const,
};

describe('InvitationScreen (second workspace, in-app)', () => {
  beforeEach(() => {
    routerState.replaces.length = 0;
    useAppStore.getState().setActiveWorkspace('ws-cafe');
  });

  it('shows who invited whom, joins, switches to the new workspace', async () => {
    const api = fakeApi({
      getMe: meFixture,
      getInvitation: invitation,
      acceptInvitation: {
        workspaceId: 'ws-nordlys',
        membershipId: 'mem-maria-2',
        workspaceName: 'Nordlys Cafe',
        role: 'EMPLOYEE',
      },
    });
    await renderApp(<InvitationScreen token="tok-123" />, { api });
    expect((await screen.findAllByText('Nordlys Cafe')).length).toBeGreaterThan(0);
    expect(screen.getByText('You were invited by')).toBeTruthy();
    expect(
      screen.getByText(
        'Elin Berg added you as an employee. Every hour they log for you shows up here, day by day.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('You join as employee')).toBeTruthy();
    expect(api.calls.find((c) => c.op === 'getInvitation')?.args[0]).toEqual({
      token: 'tok-123',
      lang: 'en',
    });
    await fireEvent.press(screen.getByTestId('invitation-join'));
    await waitFor(() => expect(api.calls.some((c) => c.op === 'acceptInvitation')).toBe(true));
    await waitFor(() => expect(useAppStore.getState().activeWorkspaceId).toBe('ws-nordlys'));
    expect(routerState.replaces.at(-1)).toBe('/');
  });

  it('explains an expired invitation from the problem code', async () => {
    const problem = new Response(JSON.stringify({ code: 'INVITATION_EXPIRED', status: 410, title: 'Gone' }), {
      status: 410,
      headers: { 'content-type': 'application/problem+json' },
    });
    const api = fakeApi({
      getMe: meFixture,
      getInvitation: invitation,
      acceptInvitation: new ResponseError(problem, 'gone'),
    });
    await renderApp(<InvitationScreen token="tok-123" />, { api });
    await screen.findAllByText('Nordlys Cafe');
    await fireEvent.press(screen.getByTestId('invitation-join'));
    expect(
      await screen.findByText('This invitation has expired. Ask Elin Berg to send a new one.'),
    ).toBeTruthy();
  });

  it('refuses an empty token', async () => {
    await renderApp(<InvitationScreen token="" />, { api: fakeApi({ getMe: meFixture }) });
    expect(await screen.findByTestId('invitation-invalid')).toBeTruthy();
  });
});

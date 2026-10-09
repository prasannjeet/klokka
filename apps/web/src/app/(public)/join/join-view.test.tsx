import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Invitation } from '@klokka/api-client';
import { LocaleProvider } from '@/lib/i18n';
import { JoinView } from './join-view';

const acceptInvitation = vi.fn();
vi.mock('@/lib/api', () => ({ api: { invitations: { acceptInvitation: () => acceptInvitation() } } }));
vi.mock('@/lib/auth-actions', () => ({ signInAction: vi.fn(), signOutAction: vi.fn() }));

const invitation = {
  email: 'new@example.com',
  status: 'PENDING',
  workspaceName: 'Kafé Nord',
  workspaceEmoji: '☕',
  workspaceColour: 'CLAY',
  inviterName: 'Anna',
} as unknown as Invitation;

function show(accountEmail: string | null, autoAccept = false) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LocaleProvider initial="en">
        <JoinView
          token="tok"
          lookup={{ kind: 'FOUND', invitation }}
          signedIn
          accountEmail={accountEmail}
          autoAccept={autoAccept}
          apkUrl={null}
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

describe('join page', () => {
  it('signed in as another account: says so, offers sign-out back to the invitation, and never accepts', () => {
    show('other@example.com', true);
    expect(screen.queryByRole('button', { name: /Join Kafé Nord/ })).toBeNull();
    expect(screen.getByText(/signed in as other@example.com/)).toBeTruthy();
    const signOut = screen.getByRole('button', { name: 'Sign out to accept' });
    const next = signOut.closest('form')?.querySelector<HTMLInputElement>('input[name=next]');
    expect(next?.value).toBe('/join?token=tok');
    expect(acceptInvitation).not.toHaveBeenCalled();
  });

  it('signed in with the invited address (any case): one click to join', () => {
    show('NEW@example.com');
    expect(screen.getByRole('button', { name: /Join Kafé Nord/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sign out to accept' })).toBeNull();
  });
});

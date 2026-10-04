// Deleting the account (CHQ-157): the owner is told which businesses go, the button waits for the typed word, and
// the API is called once before signing out.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Me } from '@klokka/api-client';
import { LocaleProvider } from '@/lib/i18n';
import { DeleteAccountDialog } from './delete-account-dialog';

const deleteMe = vi.fn().mockResolvedValue(undefined);
const signOutAction = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/api', () => ({ api: { me: { deleteMe: () => deleteMe() } } }));
vi.mock('@/lib/auth-actions', () => ({ signOutAction: () => signOutAction() }));

beforeAll(() => {
  // jsdom has no modal dialogs.
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

const me = {
  user: { id: 'u1', name: 'Olle', email: 'olle@example.com' },
  workspaces: [
    { workspaceId: 'w1', name: 'Kafé Nord', role: 'EMPLOYER' },
    { workspaceId: 'w2', name: 'Bageriet', role: 'EMPLOYEE' },
  ],
} as unknown as Me;

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LocaleProvider initial="en">
        <DeleteAccountDialog me={me} open onClose={() => {}} />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

describe('DeleteAccountDialog', () => {
  it('names the owned business, waits for the word, deletes once and signs out', async () => {
    renderDialog();
    expect(screen.getByText(/You own Kafé Nord\. It is deleted too/)).toBeTruthy();
    expect(screen.getByText(/Your hours stay with your employers/)).toBeTruthy();
    const button = screen.getByRole('button', {
      name: 'Delete my account',
      hidden: true,
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'delet' } });
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'delete' } });
    expect(button.disabled).toBe(false);

    fireEvent.click(button);
    await waitFor(() => expect(signOutAction).toHaveBeenCalledTimes(1));
    expect(deleteMe).toHaveBeenCalledTimes(1);
  });
});

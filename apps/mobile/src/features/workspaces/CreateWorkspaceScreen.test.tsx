import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { CreateWorkspaceScreen } from './CreateWorkspaceScreen';
import { fakeApi, meFixture, renderApp } from '@/testing/render';
import { routerState } from '@/testing/nativeMocks';

describe('CreateWorkspaceScreen time zone (CHQ-145)', () => {
  beforeEach(() => {
    routerState.replaces.length = 0;
  });

  it('picks the zone from a searchable list instead of free text and sends it on create', async () => {
    const api = fakeApi({
      getMe: meFixture,
      createWorkspace: { id: 'ws-new', slug: 'ny', name: 'Ny bar' },
    });
    await renderApp(<CreateWorkspaceScreen />, { api });
    // The phone's own zone is the default (jest runs in UTC).
    const field = screen.getByTestId('workspace-timezone');
    expect(screen.getByLabelText(/Change the time zone, now/)).toBeTruthy();
    await fireEvent.press(field);
    expect(screen.getByTestId('timezone-sheet')).toBeTruthy();
    // With no query the head of the list is Europe.
    expect(screen.getByTestId('timezone-Europe/Amsterdam')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('timezone-search'), 'new york');
    expect(screen.queryByTestId('timezone-Europe/Amsterdam')).toBeNull();
    await fireEvent.press(screen.getByTestId('timezone-America/New_York'));
    expect(screen.getByText('America/New York')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('workspace-name'), 'Ny bar');
    await fireEvent.press(screen.getByTestId('create-workspace-submit'));
    await waitFor(() =>
      expect(api.calls.find((c) => c.op === 'createWorkspace')?.args[0]).toMatchObject({
        workspaceCreate: { name: 'Ny bar', timezone: 'America/New_York' },
      }),
    );
  });

  it('says so when nothing matches', async () => {
    await renderApp(<CreateWorkspaceScreen />, { api: fakeApi({ getMe: meFixture }) });
    await fireEvent.press(screen.getByTestId('workspace-timezone'));
    await fireEvent.changeText(screen.getByTestId('timezone-search'), 'atlantis');
    expect(screen.getByText('No time zone matches that.')).toBeTruthy();
  });
});

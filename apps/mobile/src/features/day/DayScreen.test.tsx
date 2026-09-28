import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { DayScreen } from './DayScreen';
import { fakeApi, meFixture, renderApp } from '@/testing/render';
import { employerMeFixture, entryFixture, flagFixture, workspaceFixture } from '@/testing/fixtures';
import { routerState } from '@/testing/nativeMocks';
import { useAppStore } from '@/store/appStore';

const entry = entryFixture('mem-maria', '2026-09-23', 6.5, {
  note: 'Delivery day, stayed to unload.',
  changeCount: 2,
});
const history = [
  {
    id: 'c2',
    entryId: entry.id,
    kind: 'UPDATED' as const,
    hoursBefore: 6,
    hoursAfter: 6.5,
    changedBy: { userId: 'usr_nora', name: 'Nora Lind' },
    changedAt: new Date('2026-09-24T06:12:00Z'),
  },
  {
    id: 'c1',
    entryId: entry.id,
    kind: 'CREATED' as const,
    hoursAfter: 6,
    changedBy: { userId: 'usr_nora', name: 'Nora Lind' },
    changedAt: new Date('2026-09-23T16:40:00Z'),
  },
];

describe('DayScreen', () => {
  beforeEach(() => useAppStore.getState().setActiveWorkspace('ws-cafe'));

  it('employee: one number, the note, the history, and the flag sheet that raises a flag', async () => {
    const api = fakeApi({
      getMe: meFixture,
      listEntries: [entry],
      getEntryHistory: history,
      getWorkspace: workspaceFixture,
      raiseFlag: {},
    });
    await renderApp(<DayScreen membershipId="mem-maria" date="2026-09-23" />, { api });
    expect(await screen.findByText('6.5')).toBeTruthy();
    expect(screen.getByText('Edited once')).toBeTruthy();
    expect(screen.getByText('"Delivery day, stayed to unload."')).toBeTruthy();
    expect(screen.getByText('Nora Lind changed 6 h to 6.5 h')).toBeTruthy();
    expect(screen.getByText('Nora Lind logged 6 h')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('day-flag'));
    expect(await screen.findByText('Flag Wednesday 23 September')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('reason-NOT_IN'));
    await fireEvent.changeText(screen.getByTestId('flag-message'), 'I was off on Wednesday.');
    await fireEvent.press(screen.getByTestId('flag-send'));
    await waitFor(() =>
      expect(api.calls.find((c) => c.op === 'raiseFlag')?.args[0]).toEqual({
        workspaceId: 'ws-cafe',
        entryId: entry.id,
        flagCreate: { reason: 'NOT_IN', message: 'I was off on Wednesday.', suggestedHours: 0 },
      }),
    );
  });

  it('employer: the edit button opens the sheet pre-filled with the entry', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      listEntries: [entry],
      getEntryHistory: history,
      getWorkspace: workspaceFixture,
    });
    await renderApp(<DayScreen membershipId="mem-maria" date="2026-09-23" />, { api });
    await screen.findByText('6.5');
    await fireEvent.press(screen.getByTestId('day-edit'));
    expect(await screen.findByText('Save 6.5 h for Maria Lind')).toBeTruthy();
    expect(screen.getByTestId('remove-hours')).toBeTruthy();
  });

  it('employer: an open flag shows as a card with the reason, the suggestion and the message, and opens the resolve screen (CHQ-145)', async () => {
    routerState.pushes.length = 0;
    const flagged = entryFixture('mem-maria', '2026-09-17', 2, {
      flag: { id: 'flag-1', status: 'OPEN', reason: 'MORE', suggestedHours: 4 },
    });
    const api = fakeApi({
      getMe: employerMeFixture,
      listEntries: [flagged],
      getEntryHistory: [],
      getWorkspace: workspaceFixture,
      getFlag: flagFixture,
    });
    await renderApp(<DayScreen membershipId="mem-maria" date="2026-09-17" />, { api });
    expect(await screen.findByTestId('day-open-flag')).toBeTruthy();
    expect(screen.getByText('Flag from Maria')).toBeTruthy();
    expect(screen.getByText('Worked more than logged. Maria says 4 h')).toBeTruthy();
    expect(screen.getByText('"I worked 4 h, not 2. I stayed for the delivery after close."')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('day-resolve-flag'));
    expect(routerState.pushes.at(-1)).toEqual({ pathname: '/flag/[flagId]', params: { flagId: 'flag-1' } });
  });
});

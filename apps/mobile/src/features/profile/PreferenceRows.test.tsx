import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { JobReminderRows } from './PreferenceRows';
import { fakeApi, meFixture, renderApp } from '@/testing/render';

describe('JobReminderRows (CHQ-156)', () => {
  it('shows the default hour, saves another lead time, and turns reminders off', async () => {
    const api = fakeApi({
      getMe: meFixture,
      updateMyPreferences: { ...meFixture.preferences, jobReminderLead: 'MINUTES_30' },
    });
    await renderApp(<JobReminderRows />, { api });
    expect(await screen.findByText('On, 1 hour before.')).toBeTruthy();
    expect(screen.getByText('1 hour before')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('pref-reminder-lead'));
    await fireEvent.press(await screen.findByTestId('option-MINUTES_30'));
    await waitFor(() =>
      expect(api.calls.find((c) => c.op === 'updateMyPreferences')?.args[0]).toEqual({
        preferencesUpdate: { jobReminderLead: 'MINUTES_30' },
      }),
    );
    await fireEvent(screen.getByTestId('pref-reminders'), 'valueChange', false);
    await waitFor(() =>
      expect(api.calls.filter((c) => c.op === 'updateMyPreferences').at(-1)?.args[0]).toEqual({
        preferencesUpdate: { jobReminders: false },
      }),
    );
  });
});

import { Linking, Platform } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { JobNotificationRows } from './PreferenceRows';
import { fakeApi, meFixture, renderApp } from '@/testing/render';

describe('JobNotificationRows (CHQ-156, CHQ-188)', () => {
  it('shows the default hour, saves another lead time, and turns reminders off', async () => {
    const api = fakeApi({
      getMe: meFixture,
      updateMyPreferences: { ...meFixture.preferences, jobReminderLead: 'MINUTES_30' },
    });
    await renderApp(<JobNotificationRows />, { api });
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

  it('turns job updates off, on by default', async () => {
    const api = fakeApi({
      getMe: meFixture,
      updateMyPreferences: { ...meFixture.preferences, jobUpdates: false },
    });
    await renderApp(<JobNotificationRows />, { api });
    expect(await screen.findByText('Job updates')).toBeTruthy();
    expect(
      screen.getByText('A notification when your employer adds, changes or removes one of your jobs.'),
    ).toBeTruthy();
    expect(screen.getByTestId('pref-job-updates').props.value).toBe(true);
    await fireEvent(screen.getByTestId('pref-job-updates'), 'valueChange', false);
    await waitFor(() =>
      expect(api.calls.find((c) => c.op === 'updateMyPreferences')?.args[0]).toEqual({
        preferencesUpdate: { jobUpdates: false },
      }),
    );
  });

  it("opens the phone's notification categories on Android only", async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    const os = Platform.OS;
    try {
      Platform.OS = 'android';
      await renderApp(<JobNotificationRows />, { api: fakeApi({ getMe: meFixture }) });
      await fireEvent.press(await screen.findByTestId('pref-system-categories'));
      expect(openSettings).toHaveBeenCalledTimes(1);
      screen.unmount();
      Platform.OS = 'ios';
      await renderApp(<JobNotificationRows />, { api: fakeApi({ getMe: meFixture }) });
      await screen.findByTestId('pref-job-updates');
      expect(screen.queryByTestId('pref-system-categories')).toBeNull();
    } finally {
      Platform.OS = os;
      openSettings.mockRestore();
    }
  });
});

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { NotificationsScreen } from './NotificationsScreen';
import { fakeApi, meFixture, renderApp } from '@/testing/render';
import { notificationsFixture } from '@/testing/fixtures';
import { routerState } from '@/testing/nativeMocks';
import { useAppStore } from '@/store/appStore';

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-09-25T12:00:00Z') });
    useAppStore.getState().setActiveWorkspace('ws-cafe');
    routerState.pushes.length = 0;
  });
  afterEach(() => jest.useRealTimers());

  it('groups rows into Today and Earlier, marks a tapped row read and opens its month', async () => {
    const api = fakeApi({
      getMe: meFixture,
      listNotifications: { items: notificationsFixture, nextCursor: null, unreadCount: 1 },
      markNotificationRead: undefined,
    });
    await renderApp(<NotificationsScreen />, { api });
    expect(await screen.findByText('Nora added 5 days for you.')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('Earlier')).toBeTruthy();
    expect(screen.getByText('August is closed.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('notification-n1'));
    await waitFor(() => expect(api.calls.some((c) => c.op === 'markNotificationRead')).toBe(true));
    expect(routerState.pushes.at(-1)).toBe('/(tabs)/month?month=2026-09');
  });

  it('marks everything read from the header action', async () => {
    const api = fakeApi({
      getMe: meFixture,
      listNotifications: { items: notificationsFixture, nextCursor: null, unreadCount: 1 },
      markAllNotificationsRead: undefined,
    });
    await renderApp(<NotificationsScreen />, { api });
    await screen.findByText('Nora added 5 days for you.');
    await fireEvent.press(screen.getByTestId('mark-all-read'));
    await waitFor(() => expect(api.calls.some((c) => c.op === 'markAllNotificationsRead')).toBe(true));
  });

  it('shows the empty state', async () => {
    const api = fakeApi({
      getMe: meFixture,
      listNotifications: { items: [], nextCursor: null, unreadCount: 0 },
    });
    await renderApp(<NotificationsScreen />, { api });
    expect(
      await screen.findByText('Nothing yet. You will hear about it here the moment something changes.'),
    ).toBeTruthy();
  });
});

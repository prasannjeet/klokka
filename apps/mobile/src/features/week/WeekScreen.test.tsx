import { fireEvent, screen } from '@testing-library/react-native';
import { WeekScreen } from './WeekScreen';
import { fakeApi, meFixture, renderApp } from '@/testing/render';
import { employerMeFixture, entriesFixture, membersFixture, workspaceFixture } from '@/testing/fixtures';
import { routerState } from '@/testing/nativeMocks';
import { useAppStore } from '@/store/appStore';

describe('WeekScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-09-25T10:00:00Z') });
    useAppStore.getState().setActiveWorkspace('ws-cafe');
    routerState.pushes.length = 0;
  });
  afterEach(() => jest.useRealTimers());

  it('employer: one person per page with the week total, a tap opens the job sheet for that day', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      listMembers: membersFixture,
      listEntries: entriesFixture,
      getWorkspace: workspaceFixture,
    });
    await renderApp(<WeekScreen />, { api });
    expect(await screen.findByText('Week 39')).toBeTruthy();
    expect(screen.getByText('21 Sept to 27 Sept')).toBeTruthy();
    expect(screen.getByTestId('week-page-mem-maria')).toBeTruthy();
    expect(screen.getByTestId('week-page-mem-jonas')).toBeTruthy();
    expect(screen.getAllByText('Week total').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByTestId('day-mem-maria-2026-09-22'));
    expect(await screen.findByText('New job for Maria Lind')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('week-prev'));
    expect(await screen.findByText('Week 38')).toBeTruthy();
    expect(screen.getByText('This week')).toBeTruthy();
  });

  it('employee: only their own page, a day opens the detail', async () => {
    const api = fakeApi({
      getMe: meFixture,
      listMembers: membersFixture,
      listEntries: entriesFixture.filter((e) => e.membershipId === 'mem-maria'),
      getWorkspace: workspaceFixture,
    });
    await renderApp(<WeekScreen />, { api });
    await screen.findByText('Week 39');
    expect(screen.getByTestId('week-page-mem-maria')).toBeTruthy();
    expect(screen.queryByTestId('week-page-mem-jonas')).toBeNull();
    await fireEvent.press(screen.getByTestId('day-mem-maria-2026-09-25'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/day/[membershipId]/[date]',
      params: { membershipId: 'mem-maria', date: '2026-09-25' },
    });
  });
});

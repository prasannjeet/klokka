import { fireEvent, screen } from '@testing-library/react-native';
import { MonthScreen } from './MonthScreen';
import { intensityOf } from './HeatMapCalendar';
import { fakeApi, meFixture, renderApp } from '@/testing/render';
import { memberInsightsFixture, memberMonthFixture } from '@/testing/fixtures';
import { routerState } from '@/testing/nativeMocks';
import { useAppStore } from '@/store/appStore';

describe('MonthScreen (employee, my month)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-09-25T10:00:00Z') });
    useAppStore.getState().setActiveWorkspace('ws-cafe');
    useAppStore.getState().setPushPromptShown(true);
    routerState.pushes.length = 0;
  });
  afterEach(() => jest.useRealTimers());

  it('shows the total, the pills, earnings because pay is on, the heat-map and the day list', async () => {
    const api = fakeApi({
      getMe: meFixture,
      getMemberMonth: memberMonthFixture,
      getMemberInsights: memberInsightsFixture,
    });
    await renderApp(<MonthScreen />, { api });
    expect(await screen.findByText('92.5')).toBeTruthy();
    expect(screen.getByText('September 2026, so far')).toBeTruthy();
    expect(screen.getByText('4.6 h per working day')).toBeTruthy();
    expect(screen.getByText('+6 h vs August')).toBeTruthy();
    expect(screen.getByText('Earnings')).toBeTruthy();
    expect(screen.getByText('5 days in a row')).toBeTruthy();
    expect(screen.getByTestId('heat-map')).toBeTruthy();
    expect(screen.getByTestId('cell-2026-09-25')).toBeTruthy();
    // Sep 17 carries the open flag.
    expect(screen.getByLabelText(/2026-09-17, 2 h, Flag/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('cell-2026-09-23'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/day/[membershipId]/[date]',
      params: { membershipId: 'mem-maria', date: '2026-09-23' },
    });
  });

  it('hides money when pay is off, in Swedish', async () => {
    const api = fakeApi({
      getMe: meFixture,
      getMemberMonth: { ...memberMonthFixture, showPay: false, earnings: null },
      getMemberInsights: memberInsightsFixture,
    });
    await renderApp(<MonthScreen />, { api, locale: 'sv' });
    expect(await screen.findByText('92,5')).toBeTruthy();
    expect(screen.queryByText('Earnings')).toBeNull();
    expect(screen.queryByText('Intjänat')).toBeNull();
    expect(screen.getByText('Bästa veckan')).toBeTruthy();
  });
  it('without analysis (the employer turned it off) asks for no insights and lists the jobs instead', async () => {
    const api = fakeApi({
      getMe: {
        ...meFixture,
        workspaces: meFixture.workspaces.map((w) => ({ ...w, employeesSeeInsights: false })),
      },
      getMemberMonth: { ...memberMonthFixture, plannedHours: 4 },
      getMemberInsights: memberInsightsFixture,
    });
    await renderApp(<MonthScreen />, { api });
    expect(await screen.findByText('92.5')).toBeTruthy();
    expect(screen.getByText('Jobs this month')).toBeTruthy();
    expect(screen.getByText('88.5 h so far, 4 h planned')).toBeTruthy();
    expect(screen.queryByText('4.6 h per working day')).toBeNull();
    expect(screen.queryByTestId('month-best-week')).toBeNull();
    expect(api.calls.some((c) => c.op === 'getMemberInsights')).toBe(false);
    // Every day opens, an empty future one too.
    await fireEvent.press(screen.getByTestId('cell-2026-09-29'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/day/[membershipId]/[date]',
      params: { membershipId: 'mem-maria', date: '2026-09-29' },
    });
  });
});

describe('intensityOf', () => {
  it('maps hours to five fill steps relative to the busiest day', () => {
    expect(intensityOf(0, 8)).toBe(0);
    expect(intensityOf(1, 8)).toBe(1);
    expect(intensityOf(4, 8)).toBe(3);
    expect(intensityOf(8, 8)).toBe(5);
    expect(intensityOf(5, 0)).toBe(0);
  });
});

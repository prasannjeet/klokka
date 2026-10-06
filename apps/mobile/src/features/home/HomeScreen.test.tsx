import { fireEvent, screen, within } from '@testing-library/react-native';
import type { Entry } from '@klokka/api-client';
import { HomeScreen } from './HomeScreen';
import { fakeApi, renderApp } from '@/testing/render';
import {
  cafeLocation,
  employerMeFixture,
  entryFixture,
  flagFixture,
  insightsFixture,
  jobFixture,
  membersFixture,
  workspaceFixture,
} from '@/testing/fixtures';
import { routerState } from '@/testing/nativeMocks';
import { toIsoDate } from '@/lib/dates';
import { useAppStore } from '@/store/appStore';

// Today (the 25th) has three jobs: Maria's 08:00 to 12:00 is over at 12:00 Stockholm time, Jonas is in the
// middle of his and Ayla's starts later. Yesterday's entry must not show among today's jobs.
const entries: Entry[] = [
  entryFixture('mem-maria', '2026-09-24', 4),
  entryFixture('mem-maria', '2026-09-25', 4, {
    jobs: [jobFixture('job-maria', 4, { startTime: '08:00', location: cafeLocation })],
  }),
  entryFixture('mem-jonas', '2026-09-25', 8, { jobs: [jobFixture('job-jonas', 8, { startTime: '09:00' })] }),
  entryFixture('mem-ayla', '2026-09-25', 3, { jobs: [jobFixture('job-ayla', 3, { startTime: '15:00' })] }),
];

function homeApi(flags = [flagFixture]) {
  return fakeApi({
    getMe: employerMeFixture,
    getWorkspace: workspaceFixture,
    listMembers: membersFixture,
    listEntries: ({ from, to }: { from: Date; to: Date }) =>
      entries.filter((e) => e.workDate >= from && e.workDate <= to),
    getWorkspaceInsights: insightsFixture,
    listFlags: flags,
  });
}

describe('HomeScreen (employer, today, CHQ-171)', () => {
  beforeEach(() => {
    // 10:00 UTC is 12:00 in Stockholm.
    jest.useFakeTimers({ now: new Date('2026-09-25T10:00:00Z') });
    useAppStore.getState().setActiveWorkspace('ws-cafe');
    useAppStore.getState().setPushPromptShown(true);
    routerState.pushes.length = 0;
  });
  afterEach(() => jest.useRealTimers());

  it("shows today's figures from the insights read model", async () => {
    await renderApp(<HomeScreen />, { api: homeApi() });
    expect((await screen.findByTestId('home-today-hours')).props.children).toBe('17 h');
    expect(screen.getByText('3 jobs, 1 place')).toBeTruthy();
    expect(screen.getByText('101 h')).toBeTruthy();
    expect(screen.getByTestId('home-working-today').props.children).toBe('3 of 4');
    expect(screen.getByText('September so far')).toBeTruthy();
    expect(screen.getByText('335.5 h')).toBeTruthy();
    expect(screen.getByText('1 open flag')).toBeTruthy();
    expect(screen.getByText('September by person')).toBeTruthy();
    expect(screen.getByText('Nora Lind, employer')).toBeTruthy();
  });

  it("lists today's jobs in time order with who does them and where they stand", async () => {
    const api = homeApi();
    await renderApp(<HomeScreen />, { api });
    await screen.findByTestId('job-job-maria');
    const order = screen.getAllByTestId(/^job-job-/).map((n) => n.props.testID);
    expect(order).toEqual(['job-job-maria', 'job-job-jonas', 'job-job-ayla']);
    expect(within(screen.getByTestId('job-job-maria')).getByText('Maria Lind')).toBeTruthy();
    expect(within(screen.getByTestId('job-job-maria')).getByText('Done')).toBeTruthy();
    expect(within(screen.getByTestId('job-job-jonas')).getByText('Now')).toBeTruthy();
    expect(within(screen.getByTestId('job-job-ayla')).getByText('Later')).toBeTruthy();
    // Only today's range is asked for.
    const call = api.calls.find((c) => c.op === 'listEntries')?.args[0] as { from: Date; to: Date };
    expect([toIsoDate(call.from), toIsoDate(call.to)]).toEqual(['2026-09-25', '2026-09-25']);
  });

  it('says so when nobody has a job today', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      getWorkspace: workspaceFixture,
      listEntries: [],
      getWorkspaceInsights: insightsFixture,
      listFlags: [],
    });
    await renderApp(<HomeScreen />, { api });
    expect(await screen.findByText('No jobs today.')).toBeTruthy();
    expect(screen.queryByText('1 open flag')).toBeNull();
  });

  it('opens a flag to resolve it and the rest of the insights', async () => {
    await renderApp(<HomeScreen />, { api: homeApi() });
    await screen.findByText('1 open flag');
    await fireEvent.press(screen.getByTestId('flag-flag-1'));
    expect(routerState.pushes.at(-1)).toEqual({ pathname: '/flag/[flagId]', params: { flagId: 'flag-1' } });
    await fireEvent.press(screen.getByTestId('all-insights'));
    expect(routerState.pushes.at(-1)).toBe('/insights');
  });
});

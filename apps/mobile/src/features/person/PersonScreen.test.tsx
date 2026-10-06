import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { Entry } from '@klokka/api-client';
import { PersonScreen } from './PersonScreen';
import { fakeApi, renderApp, type FakeApi } from '@/testing/render';
import {
  employerMeFixture,
  entryFixture,
  jobFixture,
  memberMonthFixture,
  membersFixture,
  workspaceFixture,
} from '@/testing/fixtures';
import { toIsoDate } from '@/lib/dates';
import { useAppStore } from '@/store/appStore';

const entries: Entry[] = [
  entryFixture('mem-maria', '2026-09-22', 4),
  entryFixture('mem-maria', '2026-09-23', 8, { jobs: [jobFixture('job-a', 5), jobFixture('job-b', 3)] }),
  entryFixture('mem-maria', '2026-09-25', 6),
];

function personApi() {
  return fakeApi({
    getMe: employerMeFixture,
    getWorkspace: workspaceFixture,
    getMember: membersFixture[0],
    listEntries: ({ from, to }: { from: Date; to: Date }) =>
      entries.filter((e) => e.workDate >= from && e.workDate <= to),
    getMemberMonth: memberMonthFixture,
    getEntryHistory: [],
  });
}

const ranges = (api: FakeApi) =>
  api.calls
    .filter((c) => c.op === 'listEntries')
    .map((c) => {
      const a = c.args[0] as { from: Date; to: Date; membershipId?: string };
      return `${toIsoDate(a.from)}..${toIsoDate(a.to)} ${a.membershipId ?? 'all'}`;
    });

// One person behind a Day / Week / Month switch (CHQ-171): week first, the date carries over.
describe('PersonScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-09-25T10:00:00Z') });
    useAppStore.getState().setActiveWorkspace('ws-cafe');
  });
  afterEach(() => jest.useRealTimers());

  it("opens on the person's current week, and the arrows step a week", async () => {
    const api = personApi();
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="week" />, { api });
    expect(await screen.findByText('Week 39')).toBeTruthy();
    expect(screen.getByTestId('person-week')).toBeTruthy();
    expect(await screen.findByText('Maria Lind')).toBeTruthy();
    expect(ranges(api)).toContain('2026-09-14..2026-09-27 mem-maria');
    await fireEvent.press(screen.getByTestId('week-prev'));
    expect(await screen.findByText('Week 38')).toBeTruthy();
    await waitFor(() => expect(ranges(api)).toContain('2026-09-07..2026-09-20 mem-maria'));
  });

  it('opens a day with several jobs as the Day view, and an empty day in the job sheet', async () => {
    const api = personApi();
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="week" />, { api });
    await screen.findByText('Maria Lind');
    await fireEvent.press(await screen.findByTestId('day-mem-maria-2026-09-26'));
    expect(await screen.findByText('New job for Maria Lind')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('day-mem-maria-2026-09-23'));
    expect(await screen.findByTestId('day-screen')).toBeTruthy();
    await waitFor(() => expect(ranges(api)).toContain('2026-09-23..2026-09-23 mem-maria'));
    expect(screen.getByTestId('view-day').props.accessibilityState).toEqual({ checked: true });
  });

  it('switches to the month, and a day in its calendar opens as the Day view', async () => {
    const api = personApi();
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="week" />, { api });
    await screen.findByText('Week 39');
    await fireEvent.press(screen.getByTestId('view-month'));
    expect(await screen.findByTestId('member-month-screen')).toBeTruthy();
    expect(api.calls.find((c) => c.op === 'getMemberMonth')?.args[0]).toMatchObject({
      membershipId: 'mem-maria',
      month: '2026-09',
    });
    await fireEvent.press(await screen.findByTestId('cell-2026-09-17'));
    expect(await screen.findByTestId('day-screen')).toBeTruthy();
    await waitFor(() => expect(ranges(api)).toContain('2026-09-17..2026-09-17 mem-maria'));
  });

  it('opens on a given view and date', async () => {
    const api = personApi();
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="day" initialDate="2026-09-22" />, {
      api,
    });
    expect(await screen.findByTestId('day-screen')).toBeTruthy();
    await waitFor(() => expect(ranges(api)).toContain('2026-09-22..2026-09-22 mem-maria'));
  });
});

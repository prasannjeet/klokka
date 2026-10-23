// The job editor page (CHQ-185 to 187): a single job has no date or repeat, New job has both, leaving with changes
// asks first, and a series edit goes through the scope step (a schedule change only "this and following").
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseDate, type Job, type MyWorkspace } from '@klokka/api-client';
import { LocaleProvider } from '@/lib/i18n';
import { isoOf } from '@/lib/time';
import type * as Workspace from '@/lib/workspace';
import { ToastProvider } from '../toast';
import { JobEditor } from './job-editor';
import type { JobEditorMode } from '@/lib/job-links';

const calls = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  listEntries: vi.fn(),
  createJob: vi.fn(),
  updateJob: vi.fn(),
  deleteJob: vi.fn(),
  getJobScopeCounts: vi.fn(),
  previewJobRecurrence: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: calls.push, replace: calls.replace }) }));
vi.mock('@/lib/api', () => ({
  bffUrl: (path: string) => `/api/k/${path}`,
  api: {
    members: { getMember: async () => ({ id: 'm-test', displayName: 'Test Testsson' }) },
    entries: { listEntries: calls.listEntries },
    workspaces: { getWorkspace: async () => ({ rounding: 'QUARTER', defaultDayHours: 8 }) },
    places: { listRecentPlaces: async () => [], autocompletePlaces: async () => [] },
    jobs: {
      createJob: calls.createJob,
      updateJob: calls.updateJob,
      deleteJob: calls.deleteJob,
      getJobScopeCounts: calls.getJobScopeCounts,
      previewJobRecurrence: calls.previewJobRecurrence,
    },
  },
}));

const my = {
  workspaceId: 'ws',
  membershipId: 'm-owner',
  name: 'Kafé Nord',
  slug: 'kafe-nord',
  role: 'EMPLOYER',
  showPay: false,
  currency: 'SEK',
  timezone: 'Europe/Stockholm',
  weekStart: 'MONDAY',
  rounding: 'QUARTER',
  defaultDayHours: 8,
} as unknown as MyWorkspace;
vi.mock('@/lib/workspace', async (original) => {
  const actual = await original<typeof Workspace>();
  return { ...actual, useWorkspace: () => actual.viewOf(my) };
});

const SERIES_JOB: Job = {
  id: 'j1',
  hours: 4,
  startTime: '09:00',
  note: 'Counter',
  createdAt: new Date(),
  updatedAt: new Date(),
  recurrence: {
    id: 's1',
    firstDate: parseDate('2026-10-07'),
    endDate: parseDate('2027-10-06'),
    stopped: false,
    openEnded: true,
    recurrence: { frequency: 'WEEKLY', interval: 1, weekdays: new Set(['WEDNESDAY']) },
  },
} as Job;

const BACK = '/w/kafe-nord/month?member=m-test&day=2026-10-21';

beforeAll(() => {
  // jsdom has no modal dialogs; "today" is Tuesday 20 October 2026 in Stockholm.
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-20T10:00:00Z'));
});
afterAll(() => vi.useRealTimers());

beforeEach(() => {
  for (const fn of Object.values(calls)) fn.mockReset();
  window.history.replaceState(null, '', '/w/kafe-nord/jobs/new');
  calls.listEntries.mockImplementation(async ({ to }: { to: Date }) =>
    to.getDate() === 21
      ? [{ workDate: parseDate('2026-10-21'), membershipId: 'm-test', hours: 4, jobs: [SERIES_JOB] }]
      : [],
  );
  calls.createJob.mockResolvedValue({});
  calls.updateJob.mockResolvedValue({});
  calls.getJobScopeCounts.mockResolvedValue({
    onlyThis: { jobs: 1, skippedClosed: 0 },
    thisAndFuture: { jobs: 5, skippedClosed: 0 },
    all: { jobs: 9, skippedClosed: 2 },
  });
  calls.previewJobRecurrence.mockResolvedValue({
    dates: [{ date: new Date(2026, 9, 21) }],
    occurrenceCount: 3,
    lastDate: new Date(2027, 9, 6),
    endDate: new Date(2027, 9, 6),
  });
});

function renderEditor(mode: JobEditorMode, date = '2026-10-24', jobId?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LocaleProvider initial="en">
        <ToastProvider>
          <JobEditor membershipId="m-test" date={date} mode={mode} jobId={jobId} back={BACK} />
        </ToastProvider>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

const dialogButton = (name: string) => screen.getByRole('button', { name, hidden: true });

describe('JobEditor', () => {
  it('adds a single job to the day it came from, with no date and no repeat', async () => {
    renderEditor('single');
    expect(await screen.findByRole('heading', { name: 'New single job for Test' })).toBeTruthy();
    expect(screen.getByText('Saturday, 24 October 2026, does not repeat')).toBeTruthy();
    expect(screen.queryByLabelText('Date')).toBeNull();
    expect(screen.queryByTestId('job-repeat')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '4 h' }));
    fireEvent.click(screen.getByTestId('save-job'));
    await waitFor(() => expect(calls.createJob).toHaveBeenCalledTimes(1));
    expect(calls.createJob.mock.calls[0]?.[0]).toEqual({
      workspaceId: 'ws',
      membershipId: 'm-test',
      date: parseDate('2026-10-24'),
      jobWrite: { hours: 4, startTime: null, note: null },
    });
    // The guard's extra history entry is replaced, so Back from the day does not land on the editor twice.
    await waitFor(() => expect(calls.replace).toHaveBeenCalledWith(BACK));
    expect(calls.push).not.toHaveBeenCalled();
  });

  it('New job picks the date and a repeat, and a past date drops the repeat', async () => {
    renderEditor('full', '2026-10-20');
    expect(await screen.findByRole('heading', { name: 'New job for Test' })).toBeTruthy();
    expect((screen.getByLabelText('Date') as HTMLInputElement).value).toBe('2026-10-20');
    expect(screen.getByTestId('job-repeat').textContent).toContain('Does not repeat');
    fireEvent.click(screen.getByTestId('job-repeat'));
    fireEvent.click(screen.getByRole('radio', { name: 'Weekly' }));
    await waitFor(() =>
      expect((screen.getByTestId('repeat-done') as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(screen.getByTestId('repeat-done'));
    expect(screen.getByTestId('job-repeat').textContent).toContain(
      'Every week on Tue, from 20 October 2026, no end date',
    );
    fireEvent.click(screen.getByRole('button', { name: '2 h' }));
    expect(screen.getByTestId('save-job').textContent).toBe('Save recurring job');
    fireEvent.click(screen.getByTestId('save-job'));
    await waitFor(() => expect(calls.createJob).toHaveBeenCalledTimes(1));
    const { jobWrite } = calls.createJob.mock.calls[0]![0];
    expect(jobWrite.recurrence).toEqual({ frequency: 'WEEKLY', interval: 1, weekdays: new Set(['TUESDAY']) });
    expect(jobWrite.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('drops the repeat when the date moves before today', async () => {
    renderEditor('full', '2026-10-20');
    fireEvent.click(await screen.findByTestId('job-repeat'));
    fireEvent.click(screen.getByRole('radio', { name: 'Monthly' }));
    await waitFor(() =>
      expect((screen.getByTestId('repeat-done') as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(screen.getByTestId('repeat-done'));
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-12' } });
    expect(screen.queryByTestId('job-repeat')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '1 h' }));
    fireEvent.click(screen.getByTestId('save-job'));
    await waitFor(() => expect(calls.createJob).toHaveBeenCalledTimes(1));
    expect(calls.createJob.mock.calls[0]?.[0].date).toEqual(parseDate('2026-10-12'));
    expect(calls.createJob.mock.calls[0]?.[0].jobWrite.recurrence).toBeUndefined();
  });

  it('asks before Cancel throws away changes, and leaves an untouched form silently', async () => {
    renderEditor('single');
    fireEvent.click(await screen.findByTestId('job-cancel'));
    expect(calls.push).toHaveBeenCalledWith(BACK);
    expect(screen.queryByText('Discard changes?')).toBeNull();
    calls.push.mockReset();

    fireEvent.change(screen.getByLabelText('Note (optional)'), { target: { value: 'Back door' } });
    fireEvent.click(screen.getByTestId('job-cancel'));
    expect(screen.getByText('Discard changes?')).toBeTruthy();
    fireEvent.click(dialogButton('Keep editing'));
    expect(calls.push).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Note (optional)') as HTMLTextAreaElement).value).toBe('Back door');

    fireEvent.click(screen.getByTestId('job-cancel'));
    fireEvent.click(dialogButton('Discard'));
    expect(calls.replace).toHaveBeenCalledWith(BACK);
    expect(calls.push).not.toHaveBeenCalled();
  });

  it('saves a field change to a chosen range of the series, with the counts', async () => {
    renderEditor('edit', '2026-10-21', 'j1');
    expect(await screen.findByRole('heading', { name: 'Job for Test' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Note (optional)'), { target: { value: 'Side door' } });
    fireEvent.click(screen.getByTestId('save-job'));
    expect(await screen.findByLabelText('Only this job')).toBeTruthy();
    expect(screen.getByLabelText('This and the 4 following jobs')).toBeTruthy();
    expect(screen.getByLabelText(/All 9 jobs in the series/)).toBeTruthy();
    expect(screen.getByText('2 in closed months stay unchanged')).toBeTruthy();
    expect(screen.getByTestId('scope-confirm').textContent).toBe('Save changes to 1 job');
    fireEvent.click(screen.getByTestId('scope-THIS_AND_FUTURE'));
    expect(screen.getByTestId('scope-confirm').textContent).toBe('Save changes to 5 jobs');
    fireEvent.click(screen.getByTestId('scope-confirm'));
    await waitFor(() => expect(calls.updateJob).toHaveBeenCalledTimes(1));
    expect(calls.updateJob.mock.calls[0]?.[0]).toEqual({
      workspaceId: 'ws',
      jobId: 'j1',
      scope: 'THIS_AND_FUTURE',
      jobWrite: { hours: 4, startTime: '09:00', note: 'Side door' },
    });
  });

  it('changes the schedule only from this job on, with the rule and a request id', async () => {
    renderEditor('edit', '2026-10-21', 'j1');
    fireEvent.click(await screen.findByTestId('job-repeat'));
    // A series can change, not stop repeating.
    expect(screen.queryByRole('radio', { name: 'Does not repeat' })).toBeNull();
    fireEvent.change(screen.getByTestId('repeat-interval'), { target: { value: '2' } });
    await waitFor(() =>
      expect((screen.getByTestId('repeat-done') as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(screen.getByTestId('repeat-done'));
    fireEvent.click(screen.getByTestId('save-job'));
    expect(await screen.findByTestId('scope-THIS_AND_FUTURE')).toBeTruthy();
    expect(screen.queryByTestId('scope-ONLY_THIS')).toBeNull();
    expect(screen.queryByTestId('scope-ALL')).toBeNull();
    expect(screen.getByTestId('scope-schedule-from').textContent).toBe(
      'The new schedule starts Wednesday, 21 October 2026. Earlier jobs keep their dates.',
    );
    // The new schedule's jobs are not the old series' remaining ones, so the row names no count.
    expect(screen.getByLabelText('This and the following jobs')).toBeTruthy();
    expect(screen.queryByLabelText('This and the 4 following jobs')).toBeNull();
    expect(screen.getByTestId('scope-confirm').textContent).toBe('Save recurring job');
    fireEvent.click(screen.getByTestId('scope-confirm'));
    await waitFor(() => expect(calls.updateJob).toHaveBeenCalledTimes(1));
    const request = calls.updateJob.mock.calls[0]?.[0];
    expect(request.scope).toBe('THIS_AND_FUTURE');
    expect(request.jobWrite.recurrence).toEqual({
      frequency: 'WEEKLY',
      interval: 2,
      weekdays: new Set(['WEDNESDAY']),
    });
    expect(request.jobWrite.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('previews a schedule change from a past job on its rhythm, listing dates from today', async () => {
    calls.listEntries.mockImplementation(async ({ to }: { to: Date }) =>
      to.getDate() === 14
        ? [{ workDate: parseDate('2026-10-14'), membershipId: 'm-test', hours: 4, jobs: [SERIES_JOB] }]
        : [],
    );
    renderEditor('edit', '2026-10-14', 'j1');
    fireEvent.click(await screen.findByTestId('job-repeat'));
    fireEvent.change(screen.getByTestId('repeat-interval'), { target: { value: '2' } });
    await waitFor(() => expect(calls.previewJobRecurrence).toHaveBeenCalled());
    const preview = calls.previewJobRecurrence.mock.calls.at(-1)?.[0].jobRecurrencePreviewRequest;
    expect(isoOf(preview.firstDate)).toBe('2026-10-14');
    expect(isoOf(preview.fromDate)).toBe('2026-10-20');
    expect(preview.recurrence.interval).toBe(2);
  });

  it('says so when the job no longer exists', async () => {
    renderEditor('edit', '2026-10-21', 'gone');
    expect(await screen.findByRole('heading', { name: 'This job no longer exists.' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(calls.push).toHaveBeenCalledWith(BACK);
  });
});

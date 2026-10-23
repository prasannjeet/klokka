import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResponseError, type JobRecurrenceRule } from '@klokka/api-client';
import { translator } from '@klokka/core';
import { LocaleProvider } from '@/lib/i18n';
import { RecurrenceEditor, editableRule, ruleKey } from './recurrence-editor';

const preview = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { jobs: { previewJobRecurrence: (...args: unknown[]) => preview(...args) } },
}));

const PREVIEW = {
  dates: [{ date: new Date(2026, 10, 18) }, { date: new Date(2026, 11, 16) }],
  occurrenceCount: 8,
  lastDate: new Date(2027, 5, 16),
  endDate: new Date(2027, 5, 30),
};

// A problem response whose body arrives when the test says so (toProblem reads it asynchronously).
function problem(status: number, body: Promise<unknown>): ResponseError {
  return new ResponseError({ status, clone: () => ({ json: () => body }) } as unknown as Response);
}

const lastRule = (): JobRecurrenceRule =>
  preview.mock.calls.at(-1)?.[0].jobRecurrencePreviewRequest.recurrence as JobRecurrenceRule;

function Harness({ date = '2026-11-18' }: { date?: string }) {
  const [value, setValue] = useState<JobRecurrenceRule>();
  const [ready, setReady] = useState(true);
  return (
    <>
      <RecurrenceEditor workspaceId="w1" date={date} value={value} onChange={setValue} onReady={setReady} />
      <button disabled={!ready}>Save</button>
    </>
  );
}

function renderEditor() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LocaleProvider initial="en">
        <Harness />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

const save = () => screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;

describe('recurring job editor', () => {
  beforeEach(() => preview.mockReset().mockResolvedValue(PREVIEW));

  it('repeats monthly on the third Wednesday with no end date, and says so', async () => {
    renderEditor();
    fireEvent.click(screen.getByRole('radio', { name: 'Monthly' }));
    await waitFor(() => expect(save().disabled).toBe(false));
    expect(lastRule()).toEqual({
      frequency: 'MONTHLY',
      interval: 1,
      monthlyBy: 'DAY_OF_MONTH',
      dayOfMonth: 18,
    });
    fireEvent.click(screen.getByTestId('repeat-by-WEEKDAY_OF_MONTH'));
    await waitFor(() => expect(lastRule().monthlyBy).toBe('WEEKDAY_OF_MONTH'));
    // No end date sends neither an end date nor a count.
    expect(lastRule()).toEqual({
      frequency: 'MONTHLY',
      interval: 1,
      monthlyBy: 'WEEKDAY_OF_MONTH',
      weekOfMonth: 'THIRD',
      weekday: 'WEDNESDAY',
    });
    expect(
      await screen.findByText('Every month on the third Wednesday, from 18 November 2026, no end date'),
    ).toBeTruthy();
    expect(screen.getByText('Repeats until you stop it. Jobs are planned 12 months ahead.')).toBeTruthy();
    // An open series has no total.
    expect(screen.queryByText(/Last job:/)).toBeNull();
  });

  it('repeats on day 15, or on the last day as day 31', async () => {
    renderEditor();
    fireEvent.click(screen.getByRole('radio', { name: 'Monthly' }));
    fireEvent.click(screen.getByTestId('repeat-dom-15'));
    await waitFor(() => expect(lastRule().dayOfMonth).toBe(15));
    expect(screen.getByTestId('repeat-dom-15').getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByText('Shorter months use their last day.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Last day' }));
    await waitFor(() => expect(lastRule().dayOfMonth).toBe(31));
    expect(lastRule().lastDayOfMonth).toBeUndefined();
    expect(screen.getByText('Shorter months use their last day.')).toBeTruthy();
    expect(
      await screen.findByText('Every month on the last day, from 18 November 2026, no end date'),
    ).toBeTruthy();
  });

  it('ends after a count or on a date, and asks for the end again when the frequency changes', async () => {
    renderEditor();
    fireEvent.click(screen.getByRole('radio', { name: 'Weekly' }));
    fireEvent.click(screen.getByTestId('repeat-end-mode-count'));
    await waitFor(() =>
      expect(lastRule()).toMatchObject({ periodCount: 4, weekdays: new Set(['WEDNESDAY']) }),
    );
    expect(await screen.findByText('8 jobs. Last job: Wednesday, 16 June 2027.')).toBeTruthy();
    // The last weekday cannot be taken away; another can be added.
    fireEvent.click(screen.getByRole('button', { name: 'Wednesday' }));
    fireEvent.click(screen.getByRole('button', { name: 'Friday' }));
    await waitFor(() => expect(lastRule().weekdays).toEqual(new Set(['WEDNESDAY', 'FRIDAY'])));
    // A count of weeks is not a count of months.
    fireEvent.click(screen.getByRole('radio', { name: 'Monthly' }));
    expect(screen.queryByTestId('repeat-count')).toBeNull();
    expect((screen.getByTestId('repeat-end-mode-date') as HTMLInputElement).checked).toBe(true);
    expect(save().disabled).toBe(true);
    expect(screen.getByText('Choose end date')).toBeTruthy();
    fireEvent.change(screen.getByTestId('repeat-end-date'), { target: { value: '2027-03-31' } });
    await waitFor(() => expect(save().disabled).toBe(false));
    expect(lastRule().periodCount).toBeUndefined();
    fireEvent.click(screen.getByRole('radio', { name: 'Does not repeat' }));
    expect(save().disabled).toBe(false);
  });

  it('never shows the previous failure while the next one is still being read', async () => {
    const t = translator('en');
    let resolveSecond: (body: unknown) => void = () => {};
    preview
      .mockRejectedValueOnce(problem(409, Promise.resolve({ code: 'CONFLICT' })))
      .mockRejectedValueOnce(problem(409, new Promise((resolve) => (resolveSecond = resolve))));
    renderEditor();
    fireEvent.click(screen.getByRole('radio', { name: 'Weekly' }));
    await screen.findByText(t('errors.CONFLICT'));

    fireEvent.change(screen.getByTestId('repeat-interval'), { target: { value: '2' } });
    await waitFor(() => expect(lastRule().interval).toBe(2));
    await screen.findByText(t('errors.VALIDATION'));
    expect(screen.queryByText(t('errors.CONFLICT'))).toBeNull();

    resolveSecond({ code: 'MONTH_LOCKED' });
    await screen.findByText(t('errors.MONTH_LOCKED'));
  });
});

describe('editing an existing series', () => {
  it('spells out the monthly mode and turns a count into the end date', () => {
    const rule = editableRule({
      id: 's1',
      firstDate: new Date(2026, 9, 31),
      endDate: new Date(2027, 2, 31),
      stopped: false,
      openEnded: false,
      recurrence: { frequency: 'MONTHLY', interval: 1, lastDayOfMonth: true, periodCount: 6 },
    } as Parameters<typeof editableRule>[0]);
    expect(rule).toEqual({
      frequency: 'MONTHLY',
      interval: 1,
      monthlyBy: 'DAY_OF_MONTH',
      dayOfMonth: 31,
      endDate: new Date(2027, 2, 31),
    });
  });

  it('compares rules whatever order the weekdays were picked in', () => {
    const a: JobRecurrenceRule = {
      frequency: 'WEEKLY',
      interval: 1,
      weekdays: new Set(['FRIDAY', 'MONDAY']),
    };
    const b: JobRecurrenceRule = {
      interval: 1,
      frequency: 'WEEKLY',
      weekdays: new Set(['MONDAY', 'FRIDAY']),
    };
    expect(ruleKey(a)).toBe(ruleKey(b));
    expect(ruleKey({ ...a, interval: 2 })).not.toBe(ruleKey(b));
  });
});

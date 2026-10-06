import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResponseError, type JobRecurrenceRule } from '@klokka/api-client';
import { translator } from '@klokka/core';
import { LocaleProvider } from '@/lib/i18n';
import { RecurrenceEditor } from './recurrence-editor';
const preview = vi.fn().mockResolvedValue({
  dates: [{ date: new Date(2026, 9, 5) }],
  occurrenceCount: 8,
  lastDate: new Date(2026, 10, 23),
  endDate: new Date(2026, 10, 29),
});
vi.mock('@/lib/api', () => ({
  api: { jobs: { previewJobRecurrence: (...args: unknown[]) => preview(...args) } },
}));
// A problem response whose body arrives when the test says so (toProblem reads it asynchronously).
function problem(status: number, body: Promise<unknown>): ResponseError {
  return new ResponseError({ status, clone: () => ({ json: () => body }) } as unknown as Response);
}
function Harness() {
  const [value, setValue] = useState<JobRecurrenceRule>();
  const [ready, setReady] = useState(true);
  return (
    <>
      <RecurrenceEditor
        workspaceId="w1"
        date="2026-10-05"
        value={value}
        onChange={setValue}
        onReady={setReady}
      />
      <button disabled={!ready}>Save</button>
    </>
  );
}
describe('recurring job editor', () => {
  it('requires an explicit end, previews weekday changes, and clears the previous end when switching modes', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LocaleProvider initial="en">
          <Harness />
        </LocaleProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Weekly' }));
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
    expect(preview).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Ends (required)'), { target: { value: 'count' } });
    fireEvent.change(screen.getByTestId('repeat-count'), { target: { value: '8' } });
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(false),
    );
    expect(preview.mock.calls.at(-1)?.[0].jobRecurrencePreviewRequest.recurrence).toMatchObject({
      periodCount: 8,
      weekdays: new Set(['MONDAY']),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wed' }));
    await waitFor(() =>
      expect(preview.mock.calls.at(-1)?.[0].jobRecurrencePreviewRequest.recurrence.weekdays).toEqual(
        new Set(['MONDAY', 'WEDNESDAY']),
      ),
    );
    fireEvent.change(screen.getByLabelText('Ends (required)'), { target: { value: 'date' } });
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId('repeat-end-date'), { target: { value: '2026-12-31' } });
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(false),
    );
    expect(preview.mock.calls.at(-1)?.[0].jobRecurrencePreviewRequest.recurrence.periodCount).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Does not repeat' }));
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('never shows the previous failure while the next one is still being read', async () => {
    const t = translator('en');
    let resolveSecond: (body: unknown) => void = () => {};
    preview
      .mockRejectedValueOnce(problem(409, Promise.resolve({ code: 'CONFLICT' })))
      .mockRejectedValueOnce(problem(409, new Promise((resolve) => (resolveSecond = resolve))));
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LocaleProvider initial="en">
          <Harness />
        </LocaleProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Weekly' }));
    fireEvent.change(screen.getByLabelText('Ends (required)'), { target: { value: 'count' } });
    fireEvent.change(screen.getByTestId('repeat-count'), { target: { value: '8' } });
    await screen.findByText(t('errors.CONFLICT'));

    fireEvent.change(screen.getByTestId('repeat-count'), { target: { value: '9' } });
    await waitFor(() =>
      expect(preview.mock.calls.at(-1)?.[0].jobRecurrencePreviewRequest.recurrence.periodCount).toBe(9),
    );
    await screen.findByText(t('errors.VALIDATION'));
    expect(screen.queryByText(t('errors.CONFLICT'))).toBeNull();

    resolveSecond({ code: 'MONTH_LOCKED' });
    await screen.findByText(t('errors.MONTH_LOCKED'));
  });
  it('asks for the end again when the frequency changes, so weeks never turn into months', () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LocaleProvider initial="en">
          <Harness />
        </LocaleProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Weekly' }));
    fireEvent.change(screen.getByLabelText('Ends (required)'), { target: { value: 'count' } });
    fireEvent.change(screen.getByTestId('repeat-count'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Monthly' }));
    expect(screen.queryByTestId('repeat-count')).toBeNull();
    expect((screen.getByLabelText('Ends (required)') as HTMLSelectElement).value).toBe('date');
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

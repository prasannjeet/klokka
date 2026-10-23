import { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { JobRecurrenceRule } from '@klokka/api-client';
import { fakeApi, renderApp, type FakeApi } from '@/testing/render';
import { RecurrenceEditor } from './RecurrenceEditor';

// 2026-10-05 is a Monday; 2026-11-18 the third Wednesday of its month.
function Harness({ date = '2026-10-05' }: { date?: string }) {
  const [value, setValue] = useState<JobRecurrenceRule>();
  return (
    <RecurrenceEditor
      workspaceId="ws-cafe"
      date={date}
      value={value}
      onChange={setValue}
      onReady={() => {}}
      onDone={() => {}}
    />
  );
}

const previewApi = () =>
  fakeApi({
    previewJobRecurrence: {
      dates: [{ date: new Date(2026, 9, 5) }],
      occurrenceCount: 8,
      lastDate: new Date(2026, 10, 23),
      endDate: new Date(2026, 10, 29),
    },
  });

const lastRule = (api: FakeApi) =>
  (
    api.calls.filter((c) => c.op === 'previewJobRecurrence').at(-1)?.args[0] as
      { jobRecurrencePreviewRequest: { recurrence: JobRecurrenceRule } } | undefined
  )?.jobRecurrencePreviewRequest.recurrence;

const enabled = () =>
  waitFor(() =>
    expect(screen.getByTestId('repeat-done').props.accessibilityState.disabled === true).toBe(false),
  );

it('repeats with no end date by default, and sends neither an end date nor a count', async () => {
  const api = previewApi();
  await renderApp(<Harness />, { api });
  await fireEvent.press(screen.getByTestId('repeat-WEEKLY'));
  expect(screen.getByTestId('repeat-end-mode-never').props.accessibilityState).toEqual({ checked: true });
  expect(screen.getByText('Repeats until you stop it. Jobs are planned 12 months ahead.')).toBeTruthy();
  await enabled();
  const rule = lastRule(api);
  expect(rule).toMatchObject({ frequency: 'WEEKLY', interval: 1, weekdays: new Set(['MONDAY']) });
  expect(rule?.endDate).toBeUndefined();
  expect(rule?.periodCount).toBeUndefined();
  expect(screen.getByTestId('repeat-sentence')).toHaveTextContent(
    'Every week on Mon, from 5 October 2026, no end date',
  );
  // No total for a series that has no end.
  expect(screen.queryByText(/8 jobs/)).toBeNull();
});

it('uses a new server preview after changing weekdays or end type, and an end date waits for its date', async () => {
  const api = previewApi();
  await renderApp(<Harness />, { api });
  await fireEvent.press(screen.getByTestId('repeat-WEEKLY'));
  await fireEvent.press(screen.getByTestId('repeat-end-mode-count'));
  expect(screen.getByTestId('repeat-count')).toHaveTextContent('4');
  await fireEvent.press(screen.getAllByTestId('stepper-plus').at(-1)!);
  expect(screen.getByTestId('repeat-count')).toHaveTextContent('5');
  await fireEvent.press(screen.getByTestId('repeat-WEDNESDAY'));
  await waitFor(() =>
    expect(lastRule(api)).toMatchObject({ weekdays: new Set(['MONDAY', 'WEDNESDAY']), periodCount: 5 }),
  );
  await enabled();
  await fireEvent.press(screen.getByTestId('repeat-end-mode-date'));
  expect(screen.getByTestId('repeat-done').props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByTestId('repeat-end-date'));
  await fireEvent.press(screen.getByTestId('repeat-month-12'));
  await fireEvent.press(screen.getByTestId('repeat-use-date'));
  await enabled();
  expect(lastRule(api)?.periodCount).toBeUndefined();
  expect(lastRule(api)?.endDate?.getMonth()).toBe(11);
});

it('asks for the end again when the frequency changes from a count, so weeks never turn into months', async () => {
  await renderApp(<Harness />, { api: fakeApi({}) });
  await fireEvent.press(screen.getByTestId('repeat-WEEKLY'));
  await fireEvent.press(screen.getByTestId('repeat-end-mode-count'));
  expect(screen.getByTestId('repeat-count')).toHaveTextContent('4');
  await fireEvent.press(screen.getByTestId('repeat-MONTHLY'));
  expect(screen.queryByTestId('repeat-count')).toBeNull();
  expect(screen.getByTestId('repeat-end-mode-date').props.accessibilityState).toEqual({ checked: true });
  expect(screen.getByTestId('repeat-done').props.accessibilityState.disabled).toBe(true);
});

describe('monthly (CHQ-186)', () => {
  it('the third Wednesday: the weekday mode starts from the first date', async () => {
    const api = previewApi();
    await renderApp(<Harness date="2026-11-18" />, { api });
    await fireEvent.press(screen.getByTestId('repeat-MONTHLY'));
    await fireEvent.press(screen.getByTestId('repeat-by-WEEKDAY_OF_MONTH'));
    await enabled();
    expect(lastRule(api)).toEqual({
      frequency: 'MONTHLY',
      interval: 1,
      monthlyBy: 'WEEKDAY_OF_MONTH',
      weekOfMonth: 'THIRD',
      weekday: 'WEDNESDAY',
    });
    expect(screen.getByTestId('repeat-sentence')).toHaveTextContent(
      'Every month on the third Wednesday, from 18 November 2026, no end date',
    );
    await fireEvent.press(screen.getByTestId('repeat-nth-4'));
    await waitFor(() => expect(lastRule(api)).toMatchObject({ weekOfMonth: 'LAST', weekday: 'WEDNESDAY' }));
  });

  it('day 15, and Last day is day 31', async () => {
    const api = previewApi();
    await renderApp(<Harness />, { api });
    await fireEvent.press(screen.getByTestId('repeat-MONTHLY'));
    await enabled();
    expect(lastRule(api)).toEqual({
      frequency: 'MONTHLY',
      interval: 1,
      monthlyBy: 'DAY_OF_MONTH',
      dayOfMonth: 5,
    });
    await fireEvent.press(screen.getByTestId('repeat-dom-15'));
    await waitFor(() => expect(lastRule(api)).toMatchObject({ monthlyBy: 'DAY_OF_MONTH', dayOfMonth: 15 }));
    expect(screen.getByText('On day 15')).toBeTruthy();
    expect(screen.queryByText('Shorter months use their last day.')).toBeNull();
    await fireEvent.press(screen.getByTestId('repeat-dom-31'));
    await waitFor(() => expect(lastRule(api)).toMatchObject({ dayOfMonth: 31 }));
    expect(screen.getByText('Shorter months use their last day.')).toBeTruthy();
    expect(screen.getByTestId('repeat-sentence')).toHaveTextContent(
      'Every month on the last day, from 5 October 2026, no end date',
    );
  });
});

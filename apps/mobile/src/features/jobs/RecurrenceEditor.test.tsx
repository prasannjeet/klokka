import { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { JobRecurrenceRule } from '@klokka/api-client';
import { fakeApi, renderApp } from '@/testing/render';
import { RecurrenceEditor } from './RecurrenceEditor';
function Harness() {
  const [value, setValue] = useState<JobRecurrenceRule>();
  return (
    <RecurrenceEditor
      workspaceId="ws-cafe"
      date="2026-10-05"
      value={value}
      onChange={setValue}
      onReady={() => {}}
      onDone={() => {}}
    />
  );
}
it('requires a finite end and uses a new server preview after changing weekdays or end type', async () => {
  const api = fakeApi({
    previewJobRecurrence: {
      dates: [{ date: new Date(2026, 9, 5) }],
      occurrenceCount: 8,
      lastDate: new Date(2026, 10, 23),
      endDate: new Date(2026, 10, 29),
    },
  });
  await renderApp(<Harness />, { api });
  await fireEvent.press(screen.getByTestId('repeat-WEEKLY'));
  expect(screen.getByTestId('repeat-done').props.accessibilityState.disabled).toBe(true);
  expect(api.calls.filter((c) => c.op === 'previewJobRecurrence')).toHaveLength(0);
  await fireEvent.press(screen.getByTestId('repeat-end-mode-count'));
  await fireEvent.changeText(screen.getByTestId('repeat-count'), '8');
  await waitFor(() =>
    expect(screen.getByTestId('repeat-done').props.accessibilityState.disabled === true).toBe(false),
  );
  await fireEvent.press(screen.getByTestId('repeat-WEDNESDAY'));
  await waitFor(() =>
    expect(api.calls.filter((c) => c.op === 'previewJobRecurrence').at(-1)?.args[0]).toMatchObject({
      jobRecurrencePreviewRequest: {
        recurrence: { weekdays: new Set(['MONDAY', 'WEDNESDAY']), periodCount: 8 },
      },
    }),
  );
  await fireEvent.press(screen.getByTestId('repeat-end-mode-date'));
  expect(screen.getByTestId('repeat-done').props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByTestId('repeat-end-date'));
  await fireEvent.press(screen.getByTestId('repeat-month-12'));
  await fireEvent.press(screen.getByTestId('repeat-use-date'));
  await waitFor(() =>
    expect(screen.getByTestId('repeat-done').props.accessibilityState.disabled === true).toBe(false),
  );
  const request = api.calls.filter((c) => c.op === 'previewJobRecurrence').at(-1)?.args[0] as {
    jobRecurrencePreviewRequest: { recurrence: JobRecurrenceRule };
  };
  expect(request.jobRecurrencePreviewRequest.recurrence.periodCount).toBeUndefined();
  expect(request.jobRecurrencePreviewRequest.recurrence.endDate?.getMonth()).toBe(11);
});

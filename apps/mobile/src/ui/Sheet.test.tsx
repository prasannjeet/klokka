import { createRef } from 'react';
import { TextInput } from 'react-native';
import { act, screen } from '@testing-library/react-native';
import type * as NativeMocks from '@/testing/nativeMocks';
import { renderApp } from '@/testing/render';
import { AppSheet, type SheetHandle } from './Sheet';

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual<typeof NativeMocks>('@/testing/nativeMocks').keyboardAwareModule(),
);

it('keeps a focused field in a sheet above the keyboard on every phone size', async () => {
  const sheet = createRef<SheetHandle>();
  await renderApp(
    <AppSheet ref={sheet} title="Job" closeLabel="Close">
      <TextInput testID="sheet-note" />
    </AppSheet>,
  );
  await act(() => sheet.current?.present());
  const body = screen.getByTestId('keyboard-aware-scroll');
  expect(body).toContainElement(screen.getByTestId('sheet-note'));
  expect(body.props.bottomOffset).toBeGreaterThan(0);
});

import { createRef } from 'react';
import type * as ReactNative from 'react-native';
import { ScrollView, StyleSheet, TextInput } from 'react-native';
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

it('shows the close button on a main page only, so a sub-page cannot discard the main page (CHQ-172)', async () => {
  const sheet = createRef<SheetHandle>();
  const view = await renderApp(<AppSheet ref={sheet} title="Job" closeLabel="Close" />);
  await act(() => sheet.current?.present());
  expect(screen.getByTestId('sheet-close')).toBeTruthy();
  await view.rerender(<AppSheet ref={sheet} title="Job" closeLabel="Close" showClose={false} />);
  expect(screen.queryByTestId('sheet-close')).toBeNull();
});

describe('on Android, where the keyboard library cannot see a keyboard inside the native sheet (CHQ-175)', () => {
  const {
    Keyboard,
    Platform,
    TextInput: RNTextInput,
  } = jest.requireActual<typeof ReactNative>('react-native');
  let listeners: Record<string, (e: { endCoordinates: { height: number } }) => void>;
  let platform: typeof Platform.OS;

  beforeEach(() => {
    platform = Platform.OS;
    Platform.OS = 'android';
    listeners = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, cb: never) => {
      listeners[event] = cb;
      return { remove: () => undefined };
    }) as never);
  });
  afterEach(() => {
    Platform.OS = platform;
    jest.restoreAllMocks();
  });

  it('shrinks the body by the keyboard and scrolls the whole focused field above it', async () => {
    const sheet = createRef<SheetHandle>();
    await renderApp(
      <AppSheet ref={sheet} title="Job" closeLabel="Close">
        <TextInput testID="sheet-note" />
      </AppSheet>,
    );
    await act(() => sheet.current?.present());
    const body = screen.getByTestId('sheet-scroll');
    const before = StyleSheet.flatten(body.props.style).maxHeight as number;
    const scrollTo = jest.fn();
    jest.spyOn(RNTextInput.State, 'currentlyFocusedInput').mockReturnValue({
      measureLayout: (_to: unknown, done: (x: number, y: number, w: number, h: number) => void) =>
        done(0, 500, 300, 88),
    } as never);
    jest
      .spyOn(ScrollView.prototype as unknown as { getInnerViewRef: () => unknown }, 'getInnerViewRef')
      .mockReturnValue({});
    jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(scrollTo);

    await act(() => listeners.keyboardDidShow?.({ endCoordinates: { height: 300 } }));
    const after = StyleSheet.flatten(screen.getByTestId('sheet-scroll').props.style).maxHeight as number;
    expect(after).toBe(before - 300);

    await act(() => {
      screen.getByTestId('sheet-scroll').props.onLayout({ nativeEvent: { layout: { height: 200 } } });
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(scrollTo).toHaveBeenCalledWith({ y: 500 + 88 + 16 - 200, animated: true });
  });
});

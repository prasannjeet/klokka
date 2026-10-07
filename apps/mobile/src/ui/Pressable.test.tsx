import type { ComponentType } from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AppPressable, type AppPressableProps } from './Pressable';

// React 19 passes `ref` through to the native Pressable; AppPressableProps does not declare it.
const Press = AppPressable as ComponentType<AppPressableProps & { ref: (host: unknown) => void }>;

// CHQ-172: React Native on Android (Fabric) sets a view's native `enabled` flag from accessibilityState.disabled,
// but drops the key once it is false, so a button that started disabled stayed natively disabled after it was
// enabled. Android's hit test skips disabled views: only taps on the label (a child) reached it. A fresh native
// view whenever `disabled` flips is the guard.
it('gives the pressable a new native view when disabled flips, so Android cannot keep a stale disabled flag', async () => {
  const hosts: unknown[] = [];
  const track = (host: unknown) => {
    if (host && !hosts.includes(host)) hosts.push(host);
  };
  const ui = (disabled: boolean) => (
    <Press ref={track} disabled={disabled} onPress={() => {}} testID="done">
      <Text>Done</Text>
    </Press>
  );
  const view = await render(ui(true));
  await view.rerender(ui(false));
  expect(hosts).toHaveLength(2);
  // Re-rendering with the same flag keeps the same view (no needless remounts).
  await view.rerender(ui(false));
  expect(hosts).toHaveLength(2);
});

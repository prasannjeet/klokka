import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { screen } from '@testing-library/react-native';
import { DarkTheme, ThemeProvider } from 'expo-router/react-navigation';
import { renderApp } from '@/testing/render';
import { darkTheme } from '@/theme/theme';
import { TabButton } from './TabButton';

// PlatformPressable reads the navigation theme the tab navigator provides.
const inNavigator = (ui: ReactNode) => <ThemeProvider value={DarkTheme}>{ui}</ThemeProvider>;

describe('the active bottom tab (CHQ-167)', () => {
  it('marks the selected tab with the primary bar, as on the web', async () => {
    await renderApp(
      inNavigator(
        <TabButton aria-selected>
          <Text>Week</Text>
        </TabButton>,
      ),
    );
    expect(screen.getByTestId('tab-indicator')).toHaveStyle({ backgroundColor: darkTheme.color.primary });
    expect(screen.getByText('Week')).toBeTruthy();
  });

  it('leaves the other tabs unmarked (positive control)', async () => {
    await renderApp(
      inNavigator(
        <TabButton aria-selected={false}>
          <Text>Home</Text>
        </TabButton>,
      ),
    );
    expect(screen.queryByTestId('tab-indicator')).toBeNull();
    expect(screen.getByText('Home')).toBeTruthy();
  });
});

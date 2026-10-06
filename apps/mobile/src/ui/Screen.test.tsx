import { Text } from 'react-native';
import { act, screen } from '@testing-library/react-native';
import { renderApp } from '@/testing/render';
import { Screen } from './Screen';

// iOS moves the scroll view down whenever its refresh control is told it is refreshing. A background refetch on a
// tab that is not on screen left that offset behind, so the tab opened half empty (CHQ-170). The control shows
// refreshing only for the user's own pull, until the refetch it started settles.
// The refresh control's props as the scroll view received them (its host node carries none in jest).
function refreshControl(): { refreshing: boolean; onRefresh: () => unknown } {
  let node = screen.getByText('Settings').parent;
  while (node && node.type !== 'RCTScrollView') node = node.parent;
  const control = node?.props['refreshControl'] as {
    props: { refreshing: boolean; onRefresh: () => unknown };
  };
  return control.props;
}

describe('Screen pull to refresh (CHQ-170)', () => {
  it('shows refreshing only while the pull it started is pending', async () => {
    let settle: () => void = () => undefined;
    const refetch = jest.fn(() => new Promise<void>((resolve) => (settle = resolve)));
    await renderApp(
      <Screen onRefresh={refetch}>
        <Text>Settings</Text>
      </Screen>,
    );
    expect(refreshControl().refreshing).toBe(false);
    // The pull starts the refetch; the test holds it open to look at the control meanwhile.
    await act(async () => {
      void refreshControl().onRefresh();
    });
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(refreshControl().refreshing).toBe(true);
    await act(async () => settle());
    expect(refreshControl().refreshing).toBe(false);
  });

  it('stops refreshing when the refetch fails too (positive control for the settle path)', async () => {
    const refetch = jest.fn(() => Promise.reject(new Error('offline')));
    await renderApp(
      <Screen onRefresh={refetch}>
        <Text>Settings</Text>
      </Screen>,
    );
    await act(async () => {
      void refreshControl().onRefresh();
    });
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(refreshControl().refreshing).toBe(false);
  });
});

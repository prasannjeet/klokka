import { screen } from '@testing-library/react-native';
import { InsightsScreen } from './InsightsScreen';
import { fakeApi, renderApp } from '@/testing/render';
import { employerMeFixture, insightsFixture } from '@/testing/fixtures';
import { useAppStore } from '@/store/appStore';

describe('InsightsScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-09-25T10:00:00Z') });
    useAppStore.getState().setActiveWorkspace('ws-cafe');
  });
  afterEach(() => jest.useRealTimers());

  it('renders every read-model figure as the API sent it, with labour cost while pay is on', async () => {
    await renderApp(<InsightsScreen />, {
      api: fakeApi({ getMe: employerMeFixture, getWorkspaceInsights: insightsFixture }),
    });
    expect(await screen.findByText('335.5')).toBeTruthy();
    expect(screen.getByText('September, through the 25')).toBeTruthy();
    expect(screen.getByText('+3% vs August at this point')).toBeTruthy();
    expect(screen.getByText('4 people')).toBeTruthy();
    expect(screen.getByTestId('bars')).toBeTruthy();
    expect(screen.getByLabelText('Jonas, 150')).toBeTruthy();
    expect(screen.getByTestId('trend-line')).toBeTruthy();
    expect(screen.getByText('Wednesday')).toBeTruthy();
    expect(screen.getByText('22 h on average')).toBeTruthy();
    expect(screen.getByText('402')).toBeTruthy();
    expect(screen.getByText('+4% vs August')).toBeTruthy();
    expect(screen.getByText('Labour cost')).toBeTruthy();
    expect(screen.getByText('Fri 18')).toBeTruthy();
  });

  it('drops labour cost when pay is off', async () => {
    await renderApp(<InsightsScreen />, {
      api: fakeApi({
        getMe: employerMeFixture,
        getWorkspaceInsights: { ...insightsFixture, showPay: false, labourCost: null },
      }),
    });
    await screen.findByText('335.5');
    expect(screen.queryByText('Labour cost')).toBeNull();
  });
});

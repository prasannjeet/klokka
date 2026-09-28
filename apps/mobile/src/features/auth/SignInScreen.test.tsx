import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SignInScreen } from './SignInScreen';
import { fakeOidc, renderApp } from '@/testing/render';

describe('SignInScreen', () => {
  it('shows the tagline, the hints and hands the sign-in over to the OIDC client', async () => {
    const signIn = jest.fn(async () => ({ kind: 'cancelled' as const }));
    await renderApp(<SignInScreen />, { session: null, oidc: fakeOidc({ signIn }) });
    expect(screen.getByText('One clock.')).toBeTruthy();
    expect(screen.getByText('Both sides.')).toBeTruthy();
    expect(
      screen.getByText('Got an invitation? Open the link in the email first, then sign in here.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByTestId('sign-in-button'));
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Sign-in did not go through. Try again.')).toBeNull();
  });

  it('tells the user when the provider fails, in Swedish too', async () => {
    const signIn = jest.fn(async () => ({ kind: 'failed' as const, message: 'nope' }));
    await renderApp(<SignInScreen />, { session: null, oidc: fakeOidc({ signIn }), locale: 'sv' });
    expect(screen.getByText('En klocka.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Logga in'));
    await waitFor(() => expect(screen.getByText('Inloggningen gick inte igenom. Försök igen.')).toBeTruthy());
  });
});

import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { fakeApi, renderApp } from '@/testing/render';
import { cafeLocation } from '@/testing/fixtures';
import { mapsMock } from '@/testing/nativeMocks';
import { LocationPicker } from './LocationPicker';

const moved = { latitude: cafeLocation.latitude + 0.01, longitude: cafeLocation.longitude };

it('renames the place after the spot under the pin when the map is dragged, and ignores its own landing', async () => {
  const onPick = jest.fn();
  const api = fakeApi({
    listRecentPlaces: [],
    reverseGeocode: { name: 'Drottninggatan 5', address: 'Stockholm', latitude: 1, longitude: 2 },
  });
  await renderApp(
    <LocationPicker visible workspaceId="ws-cafe" value={cafeLocation} onPick={onPick} onClose={() => {}} />,
    { api },
  );
  expect(screen.getByText(cafeLocation.name)).toBeTruthy();

  // The camera resting on the place itself changes nothing.
  await act(async () => mapsMock.last?.onCameraMove?.({ coordinates: cafeLocation }));
  await new Promise((r) => setTimeout(r, 700));
  expect(api.calls.some((c) => c.op === 'reverseGeocode')).toBe(false);

  // A drag about a kilometre away names the new spot and keeps the pin's exact position.
  await act(async () => mapsMock.last?.onCameraMove?.({ coordinates: moved }));
  expect(await screen.findByText('Drottninggatan 5', {}, { timeout: 2000 })).toBeTruthy();
  await fireEvent.press(screen.getByTestId('place-use'));
  await waitFor(() =>
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Drottninggatan 5', ...moved })),
  );
});

it('keeps the picked result in the search field, so a house number can be typed after it', async () => {
  const api = fakeApi({
    listRecentPlaces: [],
    autocompletePlaces: [{ placeId: 'p1', primaryText: 'Drottninggatan', secondaryText: 'Stockholm' }],
    getPlace: { name: 'Drottninggatan', address: 'Stockholm', latitude: 59.33, longitude: 18.06 },
  });
  await renderApp(
    <LocationPicker visible workspaceId="ws-cafe" value={null} onPick={() => {}} onClose={() => {}} />,
    { api },
  );
  const search = screen.getByTestId('place-search');
  await fireEvent(search, 'focus');
  await fireEvent.changeText(search, 'Drot');
  await fireEvent.press(await screen.findByTestId('place-p1'));

  // The place is picked, and the search field now reads the result the user tapped.
  expect(await screen.findByTestId('place-picked')).toBeTruthy();
  expect(screen.getByTestId('place-search').props.value).toBe('Drottninggatan');

  // Back in the field, the user types on and searches the longer text.
  await fireEvent(search, 'focus');
  await fireEvent.changeText(search, 'Drottninggatan 5');
  await waitFor(() =>
    expect(
      api.calls.some(
        (c) => c.op === 'autocompletePlaces' && JSON.stringify(c.args).includes('Drottninggatan 5'),
      ),
    ).toBe(true),
  );
});

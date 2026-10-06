import { screen } from '@testing-library/react-native';
import { renderApp } from '@/testing/render';
import { cafeLocation } from '@/testing/fixtures';
import { MapImage } from './MapImage';

// CHQ-163: React Native's Android <Image> forwards request headers only from an ARRAY source; an object source
// drops them, so the map went out without its bearer, got a 401 and the preview hid itself on every phone.
it('sends the bearer token in an array source, the only shape Android forwards headers from', async () => {
  await renderApp(<MapImage workspaceId="ws-cafe" location={cafeLocation} height={96} />);
  const source = (await screen.findByTestId('job-map')).props.source as unknown;
  expect(Array.isArray(source)).toBe(true);
  const [first] = source as { uri: string; headers: Record<string, string> }[];
  expect(first?.uri).toContain('/workspaces/ws-cafe/map.png?latitude=59.3346&longitude=18.0632');
  expect(first?.headers.Authorization).toMatch(/^Bearer \S+$/);
});

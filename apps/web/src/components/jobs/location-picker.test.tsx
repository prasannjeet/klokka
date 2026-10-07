import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { JobLocation } from '@klokka/api-client';
import { LocaleProvider } from '@/lib/i18n';
import { LocationPicker } from './location-picker';

const autocomplete = vi
  .fn()
  .mockResolvedValue([{ placeId: 'p1', primaryText: 'Drottninggatan', secondaryText: 'Stockholm' }]);
vi.mock('@/lib/api', () => ({
  bffUrl: (path: string) => path,
  api: {
    places: {
      autocompletePlaces: (...args: unknown[]) => autocomplete(...args),
      getPlace: async () => ({
        name: 'Drottninggatan',
        address: 'Stockholm',
        latitude: 59.33,
        longitude: 18.06,
      }),
      listRecentPlaces: async () => [],
    },
  },
}));

function Harness() {
  const [value, setValue] = useState<JobLocation | null>(null);
  return <LocationPicker workspaceId="w1" value={value} onChange={setValue} />;
}

describe('job location picker', () => {
  it('keeps the picked result in the search field, so a house number can be typed after it', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LocaleProvider initial="en">
          <Harness />
        </LocaleProvider>
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByTestId('place-search'), { target: { value: 'Drot' } });
    fireEvent.click(await screen.findByText('Drottninggatan'));
    fireEvent.click(await screen.findByRole('button', { name: 'Change' }));

    const search = screen.getByTestId('place-search') as HTMLInputElement;
    expect(search.value).toBe('Drottninggatan');
    fireEvent.change(search, { target: { value: 'Drottninggatan 5' } });
    await waitFor(() => expect(autocomplete.mock.calls.at(-1)?.[0].input).toBe('Drottninggatan 5'));
  });
});

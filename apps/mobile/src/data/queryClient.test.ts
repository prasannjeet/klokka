import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import {
  persistQueryClientRestore,
  persistQueryClientSave,
  type PersistedClient,
} from '@tanstack/react-query-persist-client';
import { memberMonthFixture } from '@/testing/fixtures';
import {
  CACHE_MAX_AGE_MS,
  cacheBuster,
  cacheKeyFor,
  createPersister,
  deserializeCache,
  serializeCache,
} from './queryClient';
import { keys } from './keys';

const KEY = keys.memberMonth('ws-cafe', 'mem-maria', '2026-09');
// No garbage-collection timer, so the suite exits as soon as it is done.
const client = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

function persisted(data: unknown): PersistedClient {
  return {
    timestamp: 1,
    buster: 'x',
    clientState: {
      mutations: [],
      queries: [
        {
          queryKey: [...KEY],
          queryHash: JSON.stringify(KEY),
          dehydratedAt: 1,
          state: { data, dataUpdatedAt: 1, status: 'success' } as never,
        },
      ],
    },
  };
}

describe('the persisted query cache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('keeps every Date a Date through a save and a restore (CHQ-145: restored strings crashed every cold start)', () => {
    // Positive control: plain JSON is what crashed the app, the date comes back as a string.
    const plain = JSON.parse(JSON.stringify(persisted(memberMonthFixture))) as PersistedClient;
    const plainDay = (plain.clientState.queries[0]?.state.data as typeof memberMonthFixture).days[0];
    expect(typeof plainDay?.date).toBe('string');

    const restored = deserializeCache(serializeCache(persisted(memberMonthFixture)));
    const month = restored.clientState.queries[0]?.state.data as typeof memberMonthFixture;
    expect(month.days[0]?.date).toBeInstanceOf(Date);
    expect(month.days[0]?.date.getTime()).toBe(memberMonthFixture.days[0]?.date.getTime());
    expect(month.bestWeek?.from).toBeInstanceOf(Date);
    expect(month.days[24]?.updatedAt).toBeInstanceOf(Date);
    // Everything else is untouched, including nulls and objects that merely look similar.
    expect(month.totalHours).toBe(92.5);
    expect(month.days[25]?.hours).toBeNull();
    expect(deserializeCache(JSON.stringify({ $klokkaDate: 1, other: 2 }) as never)).toEqual({
      $klokkaDate: 1,
      other: 2,
    });
  });

  it('restores a cache saved by the real persister with Dates intact', async () => {
    const persister = createPersister('usr_maria');
    const source = client();
    source.setQueryData(KEY, memberMonthFixture);
    await persistQueryClientSave({ queryClient: source, persister, buster: cacheBuster() });
    expect(await AsyncStorage.getItem(cacheKeyFor('usr_maria'))).toContain('$klokkaDate');

    const target = client();
    await persistQueryClientRestore({
      queryClient: target,
      persister,
      buster: cacheBuster(),
      maxAge: CACHE_MAX_AGE_MS,
    });
    const month = target.getQueryData<typeof memberMonthFixture>(KEY);
    expect(month?.days[3]?.date).toBeInstanceOf(Date);
  });

  it('drops a cache written by the untagged serializer instead of reading strings back', async () => {
    const old = { ...persisted(memberMonthFixture), buster: '1.0.0', timestamp: Date.now() };
    await AsyncStorage.setItem(cacheKeyFor('usr_maria'), JSON.stringify(old));
    const target = client();
    await persistQueryClientRestore({
      queryClient: target,
      persister: createPersister('usr_maria'),
      buster: cacheBuster(),
      maxAge: CACHE_MAX_AGE_MS,
    });
    expect(target.getQueryData(KEY)).toBeUndefined();
  });
});

import { createAuthenticatedFetch, type FetchLike } from './authenticatedFetch';
import { NotAuthenticatedError } from './sessionManager';

interface RecordedCall {
  input: RequestInfo | URL;
  init: RequestInit | undefined;
}

function recordingFetch(...statuses: number[]) {
  const calls: RecordedCall[] = [];
  const impl: FetchLike = async (input, init) => {
    calls.push({ input, init });
    const status = statuses[Math.min(calls.length - 1, statuses.length - 1)] ?? 200;
    return new Response(null, { status });
  };
  return { impl, calls };
}

const authOf = (call: RecordedCall): string | null => new Headers(call.init?.headers).get('Authorization');

describe('authenticated fetch', () => {
  it('attaches the bearer and returns a success untouched', async () => {
    const { impl, calls } = recordingFetch(200);
    const onAuthRequired = jest.fn(async () => true);
    const authFetch = createAuthenticatedFetch({
      getAccessToken: async () => 'access-1',
      onAuthRequired,
      fetchImpl: impl,
    });
    const result = await authFetch('https://api.test/v1/me', { method: 'GET' });
    expect(result.status).toBe(200);
    expect(authOf(calls[0] as RecordedCall)).toBe('Bearer access-1');
    expect(onAuthRequired).not.toHaveBeenCalled();
  });

  it('refreshes once on a 401 and replays with the NEW token', async () => {
    const { impl, calls } = recordingFetch(401, 200);
    const tokens = ['access-1', 'access-2'];
    const authFetch = createAuthenticatedFetch({
      getAccessToken: async () => tokens.shift() ?? null,
      onAuthRequired: jest.fn(async () => true),
      fetchImpl: impl,
    });
    const result = await authFetch('https://api.test/v1/me');
    expect(result.status).toBe(200);
    expect(calls).toHaveLength(2);
    expect(authOf(calls[1] as RecordedCall)).toBe('Bearer access-2');
  });

  it('returns the 401 and does not loop when the refresh fails or the replay is rejected', async () => {
    const failed = recordingFetch(401);
    const noRefresh = createAuthenticatedFetch({
      getAccessToken: async () => 'a',
      onAuthRequired: async () => false,
      fetchImpl: failed.impl,
    });
    expect((await noRefresh('https://api.test/v1/me')).status).toBe(401);
    expect(failed.calls).toHaveLength(1);
    const twice = recordingFetch(401);
    const replayed = createAuthenticatedFetch({
      getAccessToken: async () => 'a',
      onAuthRequired: async () => true,
      fetchImpl: twice.impl,
    });
    expect((await replayed('https://api.test/v1/me')).status).toBe(401);
    expect(twice.calls).toHaveLength(2);
  });

  it('never retries a non-401 failure', async () => {
    const { impl, calls } = recordingFetch(409);
    const onAuthRequired = jest.fn(async () => true);
    const authFetch = createAuthenticatedFetch({
      getAccessToken: async () => 'a',
      onAuthRequired,
      fetchImpl: impl,
    });
    expect((await authFetch('https://api.test/v1/me')).status).toBe(409);
    expect(calls).toHaveLength(1);
    expect(onAuthRequired).not.toHaveBeenCalled();
  });

  it('sends nothing when there is no session', async () => {
    const { impl, calls } = recordingFetch(200);
    const onAuthRequired = jest.fn(async () => false);
    const authFetch = createAuthenticatedFetch({
      getAccessToken: async () => null,
      onAuthRequired,
      fetchImpl: impl,
    });
    await expect(authFetch('https://api.test/v1/me')).rejects.toBeInstanceOf(NotAuthenticatedError);
    expect(calls).toHaveLength(0);
    expect(onAuthRequired).toHaveBeenCalledWith('no-session');
  });
});

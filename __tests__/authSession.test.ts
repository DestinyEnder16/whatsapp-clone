// Tests for the auth session helpers.
// Checks that the session counter changes on every logout/login (so slow
// responses from an old session can be ignored) and that revokeAuthSession
// sends the refresh token to the logout endpoint, does nothing without a token,
// and reports network failures. The network call is mocked.

import {
  getAuthSessionGeneration,
  invalidateAuthSession,
  revokeAuthSession,
} from '@/services/api/authSession';

describe('auth session generation', () => {
  test('increases by one each time the session is invalidated', () => {
    const before = getAuthSessionGeneration();
    invalidateAuthSession();
    expect(getAuthSessionGeneration()).toBe(before + 1);
    invalidateAuthSession();
    expect(getAuthSessionGeneration()).toBe(before + 2);
  });

  test('an old generation no longer matches after logout and login, so late responses can be dropped', () => {
    const captured = getAuthSessionGeneration();
    invalidateAuthSession(); // logout
    invalidateAuthSession(); // login again, possibly the same account
    expect(getAuthSessionGeneration()).not.toBe(captured);
  });
});

describe('revokeAuthSession', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('does nothing without a refresh token', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    await revokeAuthSession(null);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('posts the refresh token to the logout endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
    await revokeAuthSession('refresh-123');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/v1\/auth\/logout$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ refreshToken: 'refresh-123' });
  });

  test('propagates a network failure so the caller can decide to ignore it', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('Offline')) as unknown as typeof fetch;
    await expect(revokeAuthSession('refresh-123')).rejects.toThrow('Offline');
  });
});

// Tests that each API request (and its 401 refresh-and-replay) belongs to the
// session that started it, using the real API client and middleware.
// Reproduces the review's findings: a delayed 401 for account A must not make
// the client refresh and replay A's request as account B, and a token refresh
// that straddles an account switch must not adopt the new account.
// Only the network (fetch), storage and push are replaced.
import { SessionChangedError } from '@/core/session/sessionOwner';
import { useAuthStore } from '@/core/store/useAuthStore';
import { deferred } from '../test-utils/deferred';
import { clearPersisted } from '../test-utils/mmkvMock';

jest.mock('@/core/storage/mmkv', () => require('../test-utils/mmkvMock'));
jest.mock('@/services/notifications', () => ({
  registerForPushNotificationsAsync: jest.fn(() => Promise.resolve()),
  unregisterPushDeviceAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/services/api/authSession', () => ({
  ...jest.requireActual('@/services/api/authSession'),
  revokeAuthSession: jest.fn(() => Promise.resolve()),
}));

// The API client reads the base URL and `fetch` when it is created, so both are
// set up BEFORE it is loaded.
process.env.EXPO_PUBLIC_API_URL = 'https://api.test';
const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;
const { api } = require('@/services/api/client');

const b64url = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');
/** A JWT-shaped token that expires `seconds` from now (negative = expired). */
const token = (seconds: number, label: string) =>
  `h.${b64url({ exp: Math.floor(Date.now() / 1000) + seconds, label })}.s`;

const user = (id: string) => ({ id, phoneNumber: '+2348012345678' }) as any;
const signIn = (id: string, accessSeconds = 3600) =>
  useAuthStore
    .getState()
    .setAuth(token(accessSeconds, `access-${id}`), `refresh-${id}`, user(id));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Calls are made either with a Request (the API client) or a URL string plus
// init (the token refresh); describe both the same way.
const calls = () =>
  fetchMock.mock.calls.map(([input, init]) => {
    const isRequest = typeof input !== 'string';
    return {
      url: new URL(isRequest ? input.url : input).pathname,
      auth: isRequest
        ? input.headers.get('Authorization')
        : (init?.headers?.Authorization ?? null),
    };
  });
const refreshCalls = () => calls().filter((c) => c.url === '/v1/auth/refresh');

beforeEach(() => {
  clearPersisted();
  fetchMock.mockReset();
  useAuthStore.getState().logout();
  fetchMock.mockReset(); // ignore anything logout did
});

describe('a request belongs to the session that sent it', () => {
  test('sends the current account token', async () => {
    signIn('A');
    fetchMock.mockResolvedValue(json({ id: 'A' }));

    await api.GET('/v1/me');

    expect(calls()).toHaveLength(1);
    expect(calls()[0].auth).toBe(
      `Bearer ${useAuthStore.getState().accessToken}`,
    );
  });

  test('a late 401 for A after switching to B does not refresh or replay as B', async () => {
    signIn('A');
    const response = deferred<Response>();
    fetchMock.mockReturnValueOnce(response.promise);

    const pending = api.GET('/v1/me').catch((error: unknown) => error);
    await Promise.resolve();

    // Account A signs out and B signs in while A's request is in flight.
    useAuthStore.getState().logout();
    signIn('B');
    const bAccess = useAuthStore.getState().accessToken;
    const bRefresh = useAuthStore.getState().refreshToken;

    response.resolve(json({ message: 'Unauthorized' }, 401));
    const result = await pending;

    expect(result).toBeInstanceOf(SessionChangedError);
    expect(refreshCalls()).toHaveLength(0); // B was not refreshed on A's behalf
    expect(fetchMock).toHaveBeenCalledTimes(1); // and A's request not replayed
    expect(useAuthStore.getState().accessToken).toBe(bAccess);
    expect(useAuthStore.getState().refreshToken).toBe(bRefresh);
    expect(useAuthStore.getState().user?.id).toBe('B');
  });

  test('a late 401 after logout and login as the SAME account is also not replayed', async () => {
    signIn('A');
    const response = deferred<Response>();
    fetchMock.mockReturnValueOnce(response.promise);

    const pending = api.GET('/v1/me').catch((error: unknown) => error);
    await Promise.resolve();

    useAuthStore.getState().logout();
    signIn('A'); // same account, new session

    response.resolve(json({ message: 'Unauthorized' }, 401));

    expect(await pending).toBeInstanceOf(SessionChangedError);
    expect(refreshCalls()).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('a successful response that arrives after the session ended is not delivered', async () => {
    signIn('A');
    const response = deferred<Response>();
    fetchMock.mockReturnValueOnce(response.promise);

    const pending = api.GET('/v1/me').catch((error: unknown) => error);
    await Promise.resolve();

    useAuthStore.getState().logout();
    signIn('B');
    response.resolve(json({ id: 'A', displayName: 'A private profile' }));

    expect(await pending).toBeInstanceOf(SessionChangedError);
  });

  test('a token refresh that straddles an account switch is not adopted, and the request is never sent', async () => {
    signIn('A', -60); // A's access token is already expired
    const refresh = deferred<Response>();
    fetchMock.mockReturnValueOnce(refresh.promise); // the proactive refresh

    const pending = api.GET('/v1/me').catch((error: unknown) => error);
    await Promise.resolve();
    expect(refreshCalls()).toHaveLength(1);

    useAuthStore.getState().logout();
    signIn('B');
    const bAccess = useAuthStore.getState().accessToken;

    // The refresh for A finishes now, with fresh A tokens.
    refresh.resolve(
      json({
        accessToken: token(3600, 'A-refreshed'),
        refreshToken: 'refresh-A-2',
        user: user('A'),
      }),
    );

    expect(await pending).toBeInstanceOf(SessionChangedError);
    // A's request was never sent, and B kept its own tokens and identity.
    expect(calls().filter((c) => c.url === '/v1/me')).toHaveLength(0);
    expect(useAuthStore.getState().user?.id).toBe('B');
    expect(useAuthStore.getState().accessToken).toBe(bAccess);
    expect(useAuthStore.getState().refreshToken).toBe('refresh-B');
  });

  test('a signed-out request (no token) whose 401 arrives after B signs in is not replayed as B', async () => {
    // Signed out: e.g. an OTP verification is in flight.
    const response = deferred<Response>();
    fetchMock.mockReturnValueOnce(response.promise);

    const pending = api.POST('/v1/auth/otp/verify', {
      body: { phoneNumber: '+2348012345678', code: '0000' } as any,
    });
    while (fetchMock.mock.calls.length === 0) await Promise.resolve();
    expect(calls()[0].auth).toBeNull(); // it was sent without any token

    signIn('B');
    const bAccess = useAuthStore.getState().accessToken;

    response.resolve(json({ message: 'Invalid code' }, 401));
    const { error, response: received } = await pending;

    // The server's real answer is returned, untouched.
    expect(received.status).toBe(401);
    expect(error).toEqual({ message: 'Invalid code' });
    // B was not refreshed, and nothing was replayed with B's token.
    expect(refreshCalls()).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calls().some((c) => c.auth === `Bearer ${bAccess}`)).toBe(false);
    expect(useAuthStore.getState().accessToken).toBe(bAccess);
  });
});

describe('the normal refresh-and-replay still works for the current session', () => {
  test('a 401 refreshes once and replays the request with the new token', async () => {
    signIn('A');
    const refreshed = token(3600, 'A-refreshed');
    fetchMock
      .mockResolvedValueOnce(json({ message: 'Unauthorized' }, 401)) // original
      .mockResolvedValueOnce(
        json({ accessToken: refreshed, refreshToken: 'refresh-A-2', user: user('A') }),
      ) // refresh
      .mockResolvedValueOnce(json({ id: 'A', displayName: 'Replayed' })); // replay

    const { data } = await api.GET('/v1/me');

    expect(data).toEqual({ id: 'A', displayName: 'Replayed' });
    expect(refreshCalls()).toHaveLength(1);
    expect(calls()[2].auth).toBe(`Bearer ${refreshed}`);
    expect(useAuthStore.getState().refreshToken).toBe('refresh-A-2');
  });

  test('a request is not replayed more than once', async () => {
    signIn('A');
    fetchMock
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(
        json({
          accessToken: token(3600, 'new'),
          refreshToken: 'refresh-A-2',
          user: user('A'),
        }),
      )
      .mockResolvedValueOnce(json({}, 401)); // replay is rejected too

    await api.GET('/v1/me');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(refreshCalls()).toHaveLength(1);
  });
});

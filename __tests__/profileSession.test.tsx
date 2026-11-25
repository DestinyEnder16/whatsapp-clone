// Tests that a slow profile request started by account A can never change the
// current account's user, tokens or cache after the session changed.
// Reproduces the review's finding: A's /me response arriving after
// logout/login as B used to call setUser(A's data), leaving A's user next to
// B's refresh token. Covers the useMe query and the useUpdateProfile mutation,
// including logout/login as the SAME account. The HTTP client is mocked; the
// real auth store, session counter and React Query are used.
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { QueryClient } from '@tanstack/react-query';
import { accountQueryKeys } from '@/core/lib/accountQuery';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useMe } from '@/features/auth/api/useMe';
import { useUpdateProfile } from '@/features/auth/api/useUpdateProfile';
import { api } from '@/services/api/client';
import { deferred } from '../test-utils/deferred';
import { clearPersisted } from '../test-utils/mmkvMock';
import { signIn, signOut, switchAccount } from '../test-utils/authSession';
import {
  createQueryWrapper,
  createTestQueryClient,
  deliverQueryUpdatesInsideAct,
} from '../test-utils/reactQuery';

jest.mock('@/core/storage/mmkv', () => require('../test-utils/mmkvMock'));
jest.mock('@/services/notifications', () =>
  require('../test-utils/authSession').notificationsMock(),
);
jest.mock('@/services/api/authSession', () =>
  require('../test-utils/authSession').authSessionMock(),
);
jest.mock('@/services/api/client', () => ({
  api: { GET: jest.fn(), PATCH: jest.fn(), POST: jest.fn(), PUT: jest.fn() },
}));

const get = api.GET as unknown as jest.Mock;
const patch = api.PATCH as unknown as jest.Mock;

const profile = (id: string, displayName: string) => ({
  id,
  displayName,
  phoneNumber: '+2348012345678',
  profileComplete: true,
});

let queryClient: QueryClient;

beforeAll(deliverQueryUpdatesInsideAct);

beforeEach(() => {
  clearPersisted();
  get.mockReset();
  patch.mockReset();
  signOut();
  signIn('A');
  queryClient = createTestQueryClient();
});

afterEach(() => {
  queryClient.clear();
});

const setupMe = () =>
  renderHook(() => useMe(), { wrapper: createQueryWrapper(queryClient) });

describe('useMe', () => {
  test('loads the profile and keeps the auth store in sync', async () => {
    get.mockResolvedValue({ data: profile('A', 'Alice'), error: undefined });
    const { result } = await setupMe();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(useAuthStore.getState().user).toMatchObject({ displayName: 'Alice' });
  });

  test('passes a cancellation signal to the request', async () => {
    get.mockResolvedValue({ data: profile('A', 'Alice'), error: undefined });
    const { result } = await setupMe();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(get.mock.calls[0][1].signal).toBeDefined();
  });

  test("A's late /me response after logout and login as B changes nothing for B", async () => {
    const response = deferred<any>();
    get.mockReturnValueOnce(response.promise);
    await setupMe();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

    switchAccount('B');
    const before = useAuthStore.getState();

    await act(async () => {
      response.resolve({ data: profile('A', 'Alice (A)'), error: undefined });
    });

    const after = useAuthStore.getState();
    expect(after.user?.id).toBe('B'); // not replaced by A's profile
    expect(after.user).toBe(before.user);
    expect(after.accessToken).toBe('access-B');
    expect(after.refreshToken).toBe('refresh-B');
  });

  test('the same holds when the same account logs out and back in', async () => {
    const response = deferred<any>();
    get.mockReturnValueOnce(response.promise);
    await setupMe();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

    switchAccount('A'); // new session, same account id
    const userBefore = useAuthStore.getState().user;

    await act(async () => {
      response.resolve({ data: profile('A', 'Stale name'), error: undefined });
    });

    // The previous session's data must not be written into the new session.
    expect(useAuthStore.getState().user).toBe(userBefore);
  });

  test("A's stale result does not appear in B's cache", async () => {
    const response = deferred<any>();
    get.mockReturnValueOnce(response.promise);
    await setupMe();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

    switchAccount('B');
    await act(async () => {
      response.resolve({ data: profile('A', 'Alice (A)'), error: undefined });
    });

    expect(queryClient.getQueryData(accountQueryKeys.me('B'))).toBeUndefined();
  });

  test('aborts the in-flight request when the session ends', async () => {
    get.mockReturnValueOnce(new Promise(() => {})); // never settles
    await setupMe();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    const { signal } = get.mock.calls[0][1];

    expect(signal.aborted).toBe(false);
    signOut();
    expect(signal.aborted).toBe(true);
  });

  test('reports a failed load without touching the stored user', async () => {
    get.mockResolvedValue({ data: undefined, error: { message: 'x' } });
    const userBefore = useAuthStore.getState().user;
    const { result } = await setupMe();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useAuthStore.getState().user).toBe(userBefore);
  });
});

describe('useUpdateProfile', () => {
  const setupUpdate = () =>
    renderHook(() => useUpdateProfile(), {
      wrapper: createQueryWrapper(queryClient),
    });

  test('sends the new name and returns the updated profile', async () => {
    patch.mockResolvedValue({ data: profile('A', 'New'), error: undefined });
    const { result } = await setupUpdate();

    let updated: any;
    await act(async () => {
      updated = await result.current.mutateAsync({ displayName: 'New' });
    });

    expect(updated).toMatchObject({ displayName: 'New' });
    expect(patch.mock.calls[0][1].body).toEqual({ displayName: 'New' });
  });

  test("A's saved profile arriving after B signed in is rejected, so no caller writes it", async () => {
    const response = deferred<any>();
    patch.mockReturnValueOnce(response.promise);
    const { result } = await setupUpdate();
    const onSuccess = jest.fn();

    act(() => {
      result.current.mutate({ displayName: 'A new name' }, { onSuccess });
    });
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));

    switchAccount('B');
    await act(async () => {
      response.resolve({ data: profile('A', 'A new name'), error: undefined });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(onSuccess).not.toHaveBeenCalled(); // callers' setUser never runs
    expect(useAuthStore.getState().user?.id).toBe('B');
  });

  test('also rejects a result that arrives after re-login as the same account', async () => {
    const response = deferred<any>();
    patch.mockReturnValueOnce(response.promise);
    const { result } = await setupUpdate();
    const onSuccess = jest.fn();

    act(() => {
      result.current.mutate({ displayName: 'Old session' }, { onSuccess });
    });
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));

    switchAccount('A');
    await act(async () => {
      response.resolve({ data: profile('A', 'Old session'), error: undefined });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  test('surfaces a server error message', async () => {
    patch.mockResolvedValue({ data: undefined, error: { message: 'Too long' } });
    const { result } = await setupUpdate();

    await act(async () => {
      await expect(
        result.current.mutateAsync({ displayName: 'x' }),
      ).rejects.toThrow('Too long');
    });
  });
});

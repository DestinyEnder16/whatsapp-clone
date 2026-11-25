// Tests for the auth store (login and logout).
// Checks that logging in stores the tokens and user, resets push registration
// for a different account, and registers for push only when allowed. Checks
// that logging out clears credentials, revokes the refresh token, unregisters
// push, removes the account's cached data, and still works if the server
// calls fail. Push, storage and the logout request are mocked.

import { accountQueryKeys } from '@/core/lib/accountQuery';
import { queryClient } from '@/core/lib/queryClient';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useNotificationStore } from '@/core/store/useNotificationStore';
import {
  getAuthSessionGeneration,
  revokeAuthSession,
} from '@/services/api/authSession';
import {
  registerForPushNotificationsAsync,
  unregisterPushDeviceAsync,
} from '@/services/notifications';
import { clearPersisted, readPersisted } from '../test-utils/mmkvMock';

// Boundaries replaced: storage, push notifications and the logout request.
// The real auth store, notification store, query client and session
// generation counter are exercised.
jest.mock('@/core/storage/mmkv', () => require('../test-utils/mmkvMock'));
jest.mock('@/services/notifications', () => ({
  registerForPushNotificationsAsync: jest.fn(() => Promise.resolve()),
  unregisterPushDeviceAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/services/api/authSession', () => ({
  ...jest.requireActual('@/services/api/authSession'),
  revokeAuthSession: jest.fn(() => Promise.resolve()),
}));

const user = (id: string) => ({ id, phoneNumber: '+2348012345678' }) as any;

const signedOut = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  refreshStatus: 'idle' as const,
};

beforeEach(() => {
  clearPersisted();
  useAuthStore.setState(signedOut);
  useNotificationStore.getState().resetToDefaults();
  queryClient.clear();
});

afterAll(() => {
  queryClient.clear();
});

describe('setAuth', () => {
  test('stores the tokens and user and marks the session authenticated', () => {
    useAuthStore.getState().setAuth('access-1', 'refresh-1', user('A'));

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      user: { id: 'A' },
      isAuthenticated: true,
      refreshStatus: 'idle',
    });
  });

  test('clears a previous refresh error on a fresh login', () => {
    useAuthStore.setState({ refreshStatus: 'recoverable-error' });
    useAuthStore.getState().setAuth('a', 'r', user('A'));
    expect(useAuthStore.getState().refreshStatus).toBe('idle');
  });

  test('a different account must register for push again', () => {
    useNotificationStore.setState({
      registeredAccountId: 'A',
      registrationStatus: 'registered',
    });

    useAuthStore.getState().setAuth('a', 'r', user('B'));

    expect(useNotificationStore.getState()).toMatchObject({
      registeredAccountId: null,
      registrationStatus: 'unregistered',
    });
  });

  test('the same account keeps its existing push registration', () => {
    useNotificationStore.setState({
      registeredAccountId: 'A',
      registrationStatus: 'registered',
    });

    useAuthStore.getState().setAuth('a', 'r', user('A'));

    expect(useNotificationStore.getState()).toMatchObject({
      registeredAccountId: 'A',
      registrationStatus: 'registered',
    });
  });

  test('registers for push when permission is granted and the account is not registered', () => {
    useNotificationStore.setState({ permissionStatus: 'granted' });
    useAuthStore.getState().setAuth('a', 'r', user('A'));
    expect(registerForPushNotificationsAsync).toHaveBeenCalledWith('A');
  });

  test('does not ask for push registration when permission is not granted', () => {
    useNotificationStore.setState({ permissionStatus: 'denied' });
    useAuthStore.getState().setAuth('a', 'r', user('A'));
    expect(registerForPushNotificationsAsync).not.toHaveBeenCalled();
  });
});

describe('setUser', () => {
  test('updates the profile without touching the tokens', () => {
    useAuthStore.getState().setAuth('access-1', 'refresh-1', user('A'));
    useAuthStore
      .getState()
      .setUser({ ...user('A'), displayName: 'New Name' });

    expect(useAuthStore.getState().user).toMatchObject({
      id: 'A',
      displayName: 'New Name',
    });
    expect(useAuthStore.getState().accessToken).toBe('access-1');
  });
});

describe('logout', () => {
  beforeEach(() => {
    useAuthStore.getState().setAuth('access-1', 'refresh-1', user('A'));
    jest.clearAllMocks();
  });

  test('clears every credential and the user', () => {
    useAuthStore.getState().logout();

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      refreshStatus: 'idle',
    });
  });

  test('revokes the refresh token that was active before logout', () => {
    useAuthStore.getState().logout();
    expect(revokeAuthSession).toHaveBeenCalledTimes(1);
    expect(revokeAuthSession).toHaveBeenCalledWith('refresh-1');
  });

  test('unregisters this device from push notifications', () => {
    useAuthStore.getState().logout();
    expect(unregisterPushDeviceAsync).toHaveBeenCalledTimes(1);
  });

  // This only checks the counter that ends the session. The behaviour that
  // depends on it - releasing a late response into the next session - is
  // tested end to end in apiClient.session, profileSession,
  // sendMessage.session, uploadMedia and ProfileSetupScreen.session.
  test('advances the session generation (the marker that ends in-flight work)', () => {
    const before = getAuthSessionGeneration();
    useAuthStore.getState().logout();
    expect(getAuthSessionGeneration()).toBe(before + 1);
  });

  test("removes the signed-out account's cached data but not unrelated cache", () => {
    queryClient.setQueryData(accountQueryKeys.messages('A', 'c1'), ['secret']);
    queryClient.setQueryData(['app', 'config'], { v: 1 });

    useAuthStore.getState().logout();

    expect(
      queryClient.getQueryData(accountQueryKeys.messages('A', 'c1')),
    ).toBeUndefined();
    expect(queryClient.getQueryData(['app', 'config'])).toEqual({ v: 1 });
  });

  test('resets push registration state', () => {
    useNotificationStore.setState({
      registeredAccountId: 'A',
      registrationStatus: 'registered',
    });

    useAuthStore.getState().logout();

    expect(useNotificationStore.getState()).toMatchObject({
      registeredAccountId: null,
      registrationStatus: 'unregistered',
    });
  });

  test('still signs the user out when the server calls fail', async () => {
    (revokeAuthSession as jest.Mock).mockRejectedValueOnce(new Error('Offline'));
    (unregisterPushDeviceAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Offline'),
    );

    expect(() => useAuthStore.getState().logout()).not.toThrow();
    await Promise.resolve(); // let the swallowed rejections settle

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  test('logging out when already signed out is safe and passes no token', () => {
    useAuthStore.setState(signedOut);
    useAuthStore.getState().logout();
    expect(revokeAuthSession).toHaveBeenCalledWith(null);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('persistence', () => {
  test('saves credentials and user but not runtime flags', async () => {
    useAuthStore.getState().setAuth('access-1', 'refresh-1', user('A'));
    useAuthStore.getState().setHasHydrated(true);
    await Promise.resolve();

    const persisted = readPersisted('auth-storage').state;
    expect(persisted).toMatchObject({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      user: { id: 'A' },
      isAuthenticated: true,
    });
    expect(persisted).not.toHaveProperty('hasHydrated');
    expect(persisted).not.toHaveProperty('refreshStatus');
  });
});

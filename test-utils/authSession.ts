// Helpers for tests that use the REAL auth store and session counter.
// The test file must also mock storage, push and the logout request:
//   jest.mock('@/core/storage/mmkv', () => require('../test-utils/mmkvMock'));
//   jest.mock('@/services/notifications', () => require('../test-utils/authSession').notificationsMock());
//   jest.mock('@/services/api/authSession', () => require('../test-utils/authSession').authSessionMock());
import { useAuthStore } from '@/core/store/useAuthStore';
import { act } from '@testing-library/react-native';

export const notificationsMock = () => ({
  registerForPushNotificationsAsync: jest.fn(() => Promise.resolve()),
  unregisterPushDeviceAsync: jest.fn(() => Promise.resolve()),
});

export const authSessionMock = () => ({
  ...jest.requireActual('@/services/api/authSession'),
  revokeAuthSession: jest.fn(() => Promise.resolve()),
});

export const testUser = (id: string) =>
  ({ id, phoneNumber: '+2348012345678', profileComplete: true }) as any;

// Auth-store changes re-render mounted hooks, so they are wrapped in act().
export const signIn = (id: string) => {
  act(() => {
    useAuthStore
      .getState()
      .setAuth(`access-${id}`, `refresh-${id}`, testUser(id));
  });
};

export const signOut = () => {
  act(() => {
    useAuthStore.getState().logout();
  });
};

/** Account A signs out and `id` signs in (use the same id to re-login as A). */
export const switchAccount = (id: string) => {
  signOut();
  signIn(id);
};

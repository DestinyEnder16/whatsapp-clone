// Tests that the profile-setup screen only writes a saved profile into the
// session that saved it (F2). The name is saved by account A; if A signs out and
// B (or A again, in a fresh session) signs in before the response arrives, the
// screen must not write A's profile over the new session's user, must not
// navigate the new session onward, and must not show it an error.
// The HTTP client, storage, router and toast are mocked; the real screen, auth
// store, session counter and React Query are used.
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react-native';
import type { QueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '@/core/store/useAuthStore';
import { ProfileSetupScreen } from '@/features/auth/screens/ProfileSetupScreen';
import { api } from '@/services/api/client';
import { toast } from '@/shared/utils/toast';
import { deferred } from '../test-utils/deferred';
import { clearPersisted } from '../test-utils/mmkvMock';
import { signIn, signOut, switchAccount, testUser } from '../test-utils/authSession';
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
jest.mock('@/services/api/client', () => ({ api: { PATCH: jest.fn() } }));
jest.mock('@/shared/utils/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

const patch = api.PATCH as unknown as jest.Mock;
let queryClient: QueryClient;

const renderScreen = () =>
  render(<ProfileSetupScreen />, { wrapper: createQueryWrapper(queryClient) });

async function saveName(name: string) {
  await renderScreen();
  fireEvent.changeText(screen.getByPlaceholderText('Name'), name);
  fireEvent.press(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
}

beforeAll(deliverQueryUpdatesInsideAct);

beforeEach(() => {
  clearPersisted();
  signOut();
  signIn('A');
  queryClient = createTestQueryClient();
  patch.mockReset();
  jest.clearAllMocks();
});

afterEach(() => queryClient.clear());

test('saves the name for the current session and moves on to the photo step', async () => {
  patch.mockResolvedValue({
    data: { ...testUser('A'), displayName: 'Ada' },
    error: undefined,
  });

  await saveName('Ada');

  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/upload-photo'));
  expect(useAuthStore.getState().user?.displayName).toBe('Ada');
});

test.each([
  ['B signs in', 'B'],
  ['A logs out and back in (a new session)', 'A'],
])(
  "A's saved profile arriving after %s is not written, and the new session is not navigated",
  async (_label, nextAccount) => {
    const response = deferred<any>();
    patch.mockReturnValueOnce(response.promise);

    await saveName('Old session name');

    switchAccount(nextAccount);
    const userBefore = useAuthStore.getState().user;
    const refreshBefore = useAuthStore.getState().refreshToken;

    await act(async () => {
      response.resolve({
        data: { ...testUser('A'), displayName: 'Old session name' },
        error: undefined,
      });
    });

    expect(useAuthStore.getState().user).toEqual(userBefore);
    expect(useAuthStore.getState().user?.displayName).toBeUndefined();
    expect(useAuthStore.getState().refreshToken).toBe(refreshBefore);
    expect(router.push).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  },
);

// Tests that the app carries on signed out when the saved sign-in cannot be read
// (for example a corrupt keychain entry). Previously auth was never marked as
// restored in that case, so the app waited on the splash screen forever. Storage
// is replaced with one that fails to read; the real auth store is used.
// This lives in its own file because it loads a second copy of the store with a
// different storage mock, which a file-level storage mock would override.

const broken = {
  getItem: () => {
    throw new Error('corrupt keychain entry');
  },
  setItem: () => {},
  removeItem: () => {},
};

afterEach(() => {
  jest.dontMock('@/core/storage/mmkv');
});

function loadStoreWith(storage: object) {
  jest.doMock('@/core/storage/mmkv', () => ({
    secureAuthStorage: storage,
    mmkvStorage: storage,
    storage: {},
  }));
  jest.doMock('@/services/notifications', () => ({
    registerForPushNotificationsAsync: jest.fn(),
    unregisterPushDeviceAsync: jest.fn(),
  }));
  let store: typeof import('@/core/store/useAuthStore').useAuthStore;
  jest.isolateModules(() => {
    store = require('@/core/store/useAuthStore').useAuthStore;
  });
  return store!;
}

test('continues signed out and marks auth as restored when saved sign-in is unreadable', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

  const store = loadStoreWith(broken);
  await new Promise((resolve) => setTimeout(resolve, 0));

  // The read really failed (so this exercises the error path)...
  expect(warn).toHaveBeenCalledWith(
    'Could not restore saved sign-in:',
    expect.objectContaining({ message: 'corrupt keychain entry' }),
  );
  // ...and the app carries on signed out, with auth marked as restored.
  expect(store.getState().hasHydrated).toBe(true);
  expect(store.getState().isAuthenticated).toBe(false);
  expect(store.getState().user).toBeNull();
  warn.mockRestore();
});

test('restores normally when the saved sign-in is readable', async () => {
  const saved = JSON.stringify({
    state: {
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: 'A' },
      isAuthenticated: true,
    },
    version: 0,
  });
  const store = loadStoreWith({
    getItem: () => saved,
    setItem: () => {},
    removeItem: () => {},
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(store.getState().hasHydrated).toBe(true);
  expect(store.getState().isAuthenticated).toBe(true);
  expect(store.getState().user?.id).toBe('A');
});

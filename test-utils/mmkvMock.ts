// In-memory replacement for src/core/storage/mmkv.ts so persisted zustand
// stores can run in Jest without native MMKV / SecureStore modules.
// Use from a test with:
//   jest.mock('@/core/storage/mmkv', () => require('../test-utils/mmkvMock'));
const data = new Map<string, string>();

const adapter = {
  getItem: (name: string) => data.get(name) ?? null,
  setItem: (name: string, value: string) => {
    data.set(name, value);
  },
  removeItem: (name: string) => {
    data.delete(name);
  },
};

export const mmkvStorage = adapter;
export const secureAuthStorage = adapter;
export const storage = {
  getString: (key: string) => data.get(key),
  set: (key: string, value: string) => {
    data.set(key, value);
  },
  remove: (key: string) => {
    data.delete(key);
  },
};

/** Test helpers: inspect or reset what the stores have persisted. */
export const readPersisted = (key: string) => {
  const raw = data.get(key);
  return raw === undefined ? undefined : JSON.parse(raw);
};
export const clearPersisted = () => data.clear();

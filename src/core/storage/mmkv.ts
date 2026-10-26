// src/core/storage/mmkv.ts
import { createMMKV } from "react-native-mmkv";
import type { StateStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

/**
 * Shared MMKV instance for high-performance, synchronous, JSI-backed storage.
 */
export const storage = createMMKV();

const AUTH_STORAGE_KEY = "auth-storage";
let authMigration: Promise<void> | null = null;

async function migrateAuthStorage() {
  if (!authMigration) {
    authMigration = (async () => {
      const secureValue = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
      if (secureValue === null) {
        const legacyValue = storage.getString(AUTH_STORAGE_KEY);
        if (legacyValue !== undefined) {
          await SecureStore.setItemAsync(AUTH_STORAGE_KEY, legacyValue, {
            keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
          });
        }
      }
      storage.remove(AUTH_STORAGE_KEY);
    })();
  }
  return authMigration;
}

/**
 * Zustand StateStorage adapter for MMKV.
 * Provides instant, zero-bridge synchronous reads and writes.
 */
export const secureAuthStorage: StateStorage = {
  setItem: async (name, value) => {
    await migrateAuthStorage();
    await SecureStore.setItemAsync(name, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  },
  getItem: async (name) => {
    await migrateAuthStorage();
    return SecureStore.getItemAsync(name);
  },
  removeItem: async (name) => {
    await migrateAuthStorage();
    await SecureStore.deleteItemAsync(name);
  },
};

export const mmkvStorage: StateStorage = {
  setItem: (name, value) => storage.set(name, value),
  getItem: (name) => storage.getString(name) ?? null,
  removeItem: (name) => storage.remove(name),
};

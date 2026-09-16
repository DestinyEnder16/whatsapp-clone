// src/core/storage/mmkv.ts
import { MMKV } from "react-native-mmkv";
import type { StateStorage } from "zustand/middleware";

/**
 * Shared MMKV instance for high-performance, synchronous, JSI-backed storage.
 */
export const storage = new MMKV();

/**
 * Zustand StateStorage adapter for MMKV.
 * Provides instant, zero-bridge synchronous reads and writes.
 */
export const mmkvStorage: StateStorage = {
  setItem: (name, value) => {
    storage.set(name, value);
  },
  getItem: (name) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name) => {
    storage.delete(name);
  },
};

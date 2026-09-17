// src/core/store/useThemeStore.ts
import { mmkvStorage } from "@/core/storage/mmkv";
import type { AccentColorKey, ThemeMode } from "@/shared/theme/themes";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ThemeState {
  // --- Persisted State ---
  /** Current display theme setting */
  mode: ThemeMode;
  /** Chosen accent/brand color palette */
  accentColor: AccentColorKey;

  // --- Runtime / Hydration State ---
  /**
   * Indicates whether persisted storage (AsyncStorage) has finished loading
   * into memory to prevent flickering on startup.
   */
  hasHydrated: boolean;
}

interface ThemeActions {
  setMode: (mode: ThemeMode) => void;

  /** Updates the app accent color (e.g. green, blue, orange) */
  setAccentColor: (accentColor: AccentColorKey) => void;

  /** Updates hydration state once loaded from disk */
  setHasHydrated: (state: boolean) => void;
}

export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist(
    (set) => ({
      mode: "system",
      accentColor: "green",
      hasHydrated: false,

      setMode: (mode) => set({ mode }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        mode: state.mode,
        accentColor: state.accentColor,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!error) {
          state?.setHasHydrated(true);
        }
      },
    },
  ),
);

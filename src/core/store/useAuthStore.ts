// src/core/store/useAuthStore.ts
import type { components } from "@/services/api/schema";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

// IMPORTANT : The persist middleware synchronises the zustand state with a storage engine (AsyncStorage in this case)

import { createJSONStorage, persist } from "zustand/middleware";

// Extract the user type definition directly from the OpenAPI backend schema
type User = components["schemas"]["UserResponseDto"];

interface AuthState {
  // --- Persisted State ---
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;

  // --- Runtime / Hydration State ---
  /**
   * Indicates whether persisted storage (AsyncStorage) has finished loading
   * into memory. This prevent route flickers on app launch.
   */
  hasHydrated: boolean;

  // --- Actions ---
  /** Stores tokens and user payload upon successful login or registration */
  setAuth: (accessToken: string, refreshToken: string, user: User) => void;

  /** Updates only the user profile (e.g. after editing name or uploading photo) */
  setUser: (user: User) => void;

  /** Clears all auth data and tokens (used during sign out) */
  logout: () => void;

  /** Updates the hydration status once storage is loaded */
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Default initial state (before hydration or when logged out)
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      hasHydrated: false,

      // Called when user logs in or completes OTP verification
      setAuth: (accessToken, refreshToken, user) =>
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
        }),

      // Called when user updates their profile name or avatar
      setUser: (user) => set({ user }),

      // Called when user signs out: resets all auth fields back to null/false
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),

      // Marks hydration as complete so navigation guards can safely redirect
      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      // Key name under which auth data is saved in AsyncStorage
      name: "auth-storage",

      // Storage adapter for React Native (wraps AsyncStorage)
      storage: createJSONStorage(() => AsyncStorage),

      // Only save tokens and user to storage; exclude runtime flags like `hasHydrated`
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),

      // Callback triggered when AsyncStorage finishes restoring state into memory
      onRehydrateStorage: () => (state, error) => {
        if (!error) {
          state?.setHasHydrated(true);
        }
      },
    },
  ),
);

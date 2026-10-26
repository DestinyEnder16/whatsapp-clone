// src/core/store/useAuthStore.ts
import { clearAccountQueries } from '@/core/lib/accountQuery';
import { queryClient } from '@/core/lib/queryClient';
import { secureAuthStorage } from '@/core/storage/mmkv';
import {
  invalidateAuthSession,
  revokeAuthSession,
} from '@/services/api/authSession';
import type { components } from '@/services/api/schema';
import { unregisterPushDeviceAsync } from '@/services/notifications';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Extract the user type definition directly from the OpenAPI backend schema
type User = components['schemas']['UserResponseDto'];

interface AuthState {
  // --- Persisted State ---
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  refreshStatus: 'idle' | 'retrying' | 'recoverable-error';

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
  setRefreshStatus: (status: AuthState['refreshStatus']) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Default initial state (before hydration or when logged out)
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      refreshStatus: 'idle',
      hasHydrated: false,

      // Called when user logs in or completes OTP verification
      setAuth: (accessToken, refreshToken, user) =>
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
          refreshStatus: 'idle',
        }),

      // Called when user updates their profile name or avatar
      setUser: (user) => set({ user }),

      // Called when user signs out: resets all auth fields back to null/false
      logout: () => {
        const refreshToken = useAuthStore.getState().refreshToken;
        invalidateAuthSession();
        clearAccountQueries(queryClient);
        unregisterPushDeviceAsync().catch(() => {});
        revokeAuthSession(refreshToken).catch(() => {});
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          refreshStatus: 'idle',
        });
      },

      // Marks hydration as complete so navigation guards can safely redirect
      setHasHydrated: (state) => set({ hasHydrated: state }),
      setRefreshStatus: (refreshStatus) => set({ refreshStatus }),
    }),
    {
      // Key name under which auth data is saved in MMKV
      name: 'auth-storage',

      // Synchronous JSI storage adapter (wraps MMKV)
      storage: createJSONStorage(() => secureAuthStorage),

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
    }
  )
);

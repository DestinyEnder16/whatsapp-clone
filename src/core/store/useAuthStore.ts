// src/core/store/useAuthStore.ts
import { create } from "zustand";
import type { components } from "@/services/api/schema";

type User = components["schemas"]["UserResponseDto"];

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (accessToken: string, refreshToken: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,

  setAuth: (accessToken, refreshToken, user) =>
    set({
      accessToken,
      refreshToken,
      user,
      isAuthenticated: true,
    }),

  setUser: (user) => set({ user }),

  logout: () =>
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    }),
}));

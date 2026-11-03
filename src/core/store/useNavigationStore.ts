// src/core/store/useNavigationStore.ts
import { mmkvStorage } from '@/core/storage/mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface PendingDestination {
  pathname: string;
  params?: Record<string, string>;
  conversationId?: string;
}

interface NavigationState {
  pendingDestination: PendingDestination | null;
  setPendingDestination: (destination: PendingDestination | null) => void;
  setPendingConversationId: (conversationId: string) => void;
  clearPendingDestination: () => void;
  consumePendingDestination: () => PendingDestination | null;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      pendingDestination: null,

      setPendingDestination: (pendingDestination) =>
        set({ pendingDestination }),

      setPendingConversationId: (conversationId: string) =>
        set({
          pendingDestination: {
            pathname: `/chat/${conversationId}`,
            params: { id: conversationId },
            conversationId,
          },
        }),

      clearPendingDestination: () => set({ pendingDestination: null }),

      consumePendingDestination: () => {
        const dest = get().pendingDestination;
        if (dest) {
          set({ pendingDestination: null });
        }
        return dest;
      },
    }),
    {
      name: 'navigation-store',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

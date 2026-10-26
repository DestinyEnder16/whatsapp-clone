import { useAuthStore } from '@/core/store/useAuthStore';
import { create } from 'zustand';
import type { MatchedContactItem } from '../hooks/useSyncContacts';

interface ContactMatchesState {
  accountId: string | null;
  matches: MatchedContactItem[];
  hasSynced: boolean;
  setMatches: (accountId: string, matches: MatchedContactItem[]) => void;
  clear: () => void;
}

export const useContactMatchesStore = create<ContactMatchesState>((set) => ({
  accountId: null,
  matches: [],
  hasSynced: false,
  setMatches: (accountId, matches) =>
    set({ accountId, matches, hasSynced: true }),
  clear: () => set({ accountId: null, matches: [], hasSynced: false }),
}));

useAuthStore.subscribe((state, previousState) => {
  if (
    state.user?.id !== previousState.user?.id ||
    state.isAuthenticated !== previousState.isAuthenticated
  ) {
    useContactMatchesStore.getState().clear();
  }
});

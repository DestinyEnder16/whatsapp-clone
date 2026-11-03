import { mmkvStorage } from '@/core/storage/mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ChatDraftState {
  drafts: Record<string, string>;
  setDraft: (accountId: string, conversationId: string, value: string) => void;
  clearDraft: (accountId: string, conversationId: string) => void;
}

const draftKey = (accountId: string, conversationId: string) =>
  `${accountId}:${conversationId}`;

export const useChatDraftStore = create<ChatDraftState>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft: (accountId, conversationId, value) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [draftKey(accountId, conversationId)]: value,
          },
        })),
      clearDraft: (accountId, conversationId) =>
        set((state) => {
          const next = { ...state.drafts };
          delete next[draftKey(accountId, conversationId)];
          return { drafts: next };
        }),
    }),
    { name: 'chat-drafts', storage: createJSONStorage(() => mmkvStorage) }
  )
);

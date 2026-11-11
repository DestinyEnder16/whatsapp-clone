import { mmkvStorage } from '@/core/storage/mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type OutboxMessageStatus = 'pending' | 'failed';

export interface OutboxMessage {
  accountId: string;
  conversationId: string;
  clientMessageId: string;
  text?: string;
  attachmentMediaIds?: string[];
  createdAt: string;
  status: OutboxMessageStatus;
}

interface MessageOutboxState {
  messages: Record<string, OutboxMessage>;
  save: (message: OutboxMessage) => void;
  markFailed: (
    accountId: string,
    conversationId: string,
    clientMessageId: string
  ) => void;
  remove: (
    accountId: string,
    conversationId: string,
    clientMessageId: string
  ) => void;
}

const outboxKey = (
  accountId: string,
  conversationId: string,
  clientMessageId: string
) => `${accountId}:${conversationId}:${clientMessageId}`;

export const useMessageOutboxStore = create<MessageOutboxState>()(
  persist(
    (set) => ({
      messages: {},
      save: (message) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [outboxKey(
              message.accountId,
              message.conversationId,
              message.clientMessageId
            )]: message,
          },
        })),
      markFailed: (accountId, conversationId, clientMessageId) =>
        set((state) => {
          const key = outboxKey(accountId, conversationId, clientMessageId);
          const message = state.messages[key];
          if (!message) return state;
          return {
            messages: {
              ...state.messages,
              [key]: { ...message, status: 'failed' },
            },
          };
        }),
      remove: (accountId, conversationId, clientMessageId) =>
        set((state) => {
          const next = { ...state.messages };
          delete next[outboxKey(accountId, conversationId, clientMessageId)];
          return { messages: next };
        }),
    }),
    {
      name: 'chat-message-outbox',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

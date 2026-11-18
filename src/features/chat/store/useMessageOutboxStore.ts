import { mmkvStorage } from '@/core/storage/mmkv';
import type { StoredSelection } from '@/services/media/uploadOperationStore';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type OutboxMessageStatus = 'pending' | 'failed';

/**
 * A photo message whose upload has not finished. The upload itself is tracked
 * (stage by stage) in the upload operation store under the same id.
 */
export interface OutboxUpload {
  clientUploadId: string;
  media: StoredSelection;
}

export interface OutboxMessage {
  accountId: string;
  conversationId: string;
  clientMessageId: string;
  text?: string;
  attachmentMediaIds?: string[];
  /** Present while the photo still has to be (re)uploaded before sending. */
  upload?: OutboxUpload;
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
  /**
   * Record the completed media ids so a retry sends without uploading again.
   * `upload` is kept so the finished upload record can still be cleaned up.
   */
  attachUploadedMedia: (
    accountId: string,
    conversationId: string,
    clientMessageId: string,
    attachmentMediaIds: string[]
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
      attachUploadedMedia: (
        accountId,
        conversationId,
        clientMessageId,
        attachmentMediaIds
      ) =>
        set((state) => {
          const key = outboxKey(accountId, conversationId, clientMessageId);
          const message = state.messages[key];
          if (!message) return state;
          return {
            messages: {
              ...state.messages,
              [key]: { ...message, attachmentMediaIds },
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

// src/features/chat/api/useSendMessage.ts
import { accountQueryKeys } from '@/core/lib/accountQuery';
import {
  assertSessionOwnerCurrent,
  captureSessionOwner,
  SessionChangedError,
  type SessionOwner,
} from '@/core/session/sessionOwner';
import { api } from '@/services/api/client';
import type { components } from '@/services/api/schema';
import {
  discardUploadOperation,
  uploadMedia,
  type SelectedMedia,
} from '@/services/media/uploadMedia';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMessageOutboxStore } from '../store/useMessageOutboxStore';

export type MessageDto = components['schemas']['MessageResponseDto'];
export type LocalMessageDto = MessageDto & {
  sendStatus?: 'pending' | 'failed';
  attachmentMediaIds?: string[];
  /** Photo still to be uploaded (kept so a failed send can be retried). */
  localMedia?: SelectedMedia;
  clientUploadId?: string;
};
type MessageCache = {
  pages: Array<{ items: MessageDto[]; pageInfo: any }>;
  pageParams: unknown[];
};

export function generateClientMessageId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface SendMessageVariables {
  conversationId: string;
  text?: string;
  attachmentMediaIds?: string[];
  clientMessageId?: string;
  /** A photo to upload before sending. Needs a clientUploadId to be resumable. */
  media?: SelectedMedia;
  clientUploadId?: string;
}

/** What onMutate decides once, and mutationFn / callbacks must reuse. */
interface SendOperation {
  owner: SessionOwner;
  clientMessageId: string;
}

// onMutate and mutationFn receive the same `variables` object, so the owner and
// the message id decided in onMutate (before any await) are handed to
// mutationFn through it. Previously mutationFn could invent a second id.
const operations = new WeakMap<object, SendOperation>();

/** Is this message already confirmed by the server (not a local placeholder)? */
function isServerConfirmed(item: MessageDto & { sendStatus?: string }) {
  return !item.id.startsWith('optimistic-') && !item.sendStatus;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: SendMessageVariables) => {
      const { conversationId, text } = variables;
      const operation = operations.get(variables);
      if (!operation) throw new SessionChangedError();
      const { owner, clientMessageId } = operation;
      const accountId = owner.accountId!;

      assertSessionOwnerCurrent(owner);

      let attachmentMediaIds = variables.attachmentMediaIds;

      // Photo: upload first, on behalf of the SAME owner. The upload resumes
      // from whichever stage failed last time (see uploadMedia).
      if (!attachmentMediaIds?.length && variables.media) {
        const completed = await uploadMedia(variables.media, 'message_attachment', {
          owner,
          clientUploadId: variables.clientUploadId,
        });
        // The upload helper verifies ownership after each step; verify again
        // before using its result to submit a message.
        assertSessionOwnerCurrent(owner);
        attachmentMediaIds = [completed.id];
        // Remember the finished upload so a failed send is retried without
        // uploading again.
        useMessageOutboxStore
          .getState()
          .attachUploadedMedia(
            accountId,
            conversationId,
            clientMessageId,
            attachmentMediaIds
          );
      }

      const { data, error } = await api.POST(
        '/v1/conversations/{conversationId}/messages',
        {
          params: {
            path: { conversationId },
          },
          body: {
            clientMessageId,
            text,
            attachmentMediaIds,
          },
          signal: owner.signal,
        }
      );

      if (error) {
        throw new Error((error as any)?.message || 'Failed to send message');
      }

      return data as MessageDto;
    },

    // Optimistic Update implementation
    onMutate: async (variables) => {
      const {
        conversationId,
        text,
        attachmentMediaIds,
        clientMessageId,
        media,
        clientUploadId,
      } = variables;

      // 1. Capture ownership FIRST, before the first await. Reading the account
      //    after `await cancelQueries` let a send prepared by account A be
      //    saved into account B's outbox if the session changed in between.
      const owner = captureSessionOwner();
      if (!owner.accountId) throw new SessionChangedError();
      const accountId = owner.accountId;
      const stableClientMessageId =
        clientMessageId || generateClientMessageId();
      operations.set(variables, { owner, clientMessageId: stableClientMessageId });

      const messagesKey = accountQueryKeys.messages(accountId, conversationId);
      await queryClient.cancelQueries({ queryKey: messagesKey });

      // 2. Stop if the session changed while preparing. Nothing is written.
      assertSessionOwnerCurrent(owner);

      const previousMessages =
        queryClient.getQueryData<MessageCache>(messagesKey);

      const createdAt = new Date().toISOString();
      useMessageOutboxStore.getState().save({
        accountId,
        conversationId,
        clientMessageId: stableClientMessageId,
        text,
        attachmentMediaIds,
        upload:
          media && clientUploadId
            ? { clientUploadId, media }
            : undefined,
        createdAt,
        status: 'pending',
      });

      const optimisticMessage: LocalMessageDto = {
        id: `optimistic-${stableClientMessageId}`,
        conversationId,
        clientMessageId: stableClientMessageId,
        senderId: accountId,
        kind: attachmentMediaIds?.length || media ? 'image' : 'text',
        text: text || '',
        attachments: [],
        attachmentMediaIds,
        localMedia: media,
        clientUploadId,
        createdAt,
        sendStatus: 'pending',
      };

      queryClient.setQueryData(messagesKey, (old: MessageCache | undefined) => {
        if (!old) {
          return {
            pages: [
              {
                items: [optimisticMessage],
                pageInfo: { nextCursor: null, hasNextPage: false },
              },
            ],
            pageParams: [null],
          };
        }

        const firstPage = old.pages[0];
        const existingIndex = firstPage.items.findIndex(
          (item) => item.clientMessageId === stableClientMessageId
        );
        if (existingIndex >= 0) {
          const items = [...firstPage.items] as LocalMessageDto[];
          // A retry only flips the existing row back to pending. A row the
          // server already confirmed is left exactly as it is.
          if (isServerConfirmed(items[existingIndex])) return old;
          items[existingIndex] = {
            ...items[existingIndex],
            sendStatus: 'pending',
          };
          return {
            ...old,
            pages: [{ ...firstPage, items }, ...old.pages.slice(1)],
          };
        }

        return {
          ...old,
          pages: [
            { ...firstPage, items: [...firstPage.items, optimisticMessage] },
            ...old.pages.slice(1),
          ],
        };
      });

      return {
        previousMessages,
        optimisticMessage,
        stableClientMessageId,
        outboxAccountId: accountId,
        owner,
      };
    },

    onError: (error, variables, context) => {
      // onMutate threw (e.g. the session changed while preparing): nothing was
      // written, so there is nothing to undo.
      if (!context) return;
      const { outboxAccountId, stableClientMessageId, owner } = context;
      const outbox = useMessageOutboxStore.getState();
      const messagesKey = accountQueryKeys.messages(
        outboxAccountId,
        variables.conversationId
      );

      // The server (via socket or history) may already have confirmed this
      // message before the HTTP request failed. Confirmation is authoritative:
      // do not downgrade the confirmed row to "failed" or keep a Retry for it.
      const cached = queryClient.getQueryData<MessageCache>(messagesKey);
      const alreadyConfirmed = cached?.pages.some((page) =>
        page.items.some(
          (item) =>
            item.clientMessageId === stableClientMessageId &&
            isServerConfirmed(item)
        )
      );
      if (alreadyConfirmed) {
        outbox.remove(
          outboxAccountId,
          variables.conversationId,
          stableClientMessageId
        );
        return;
      }

      // Otherwise keep the operation, durably, for a retry in its own account.
      outbox.markFailed(
        outboxAccountId,
        variables.conversationId,
        stableClientMessageId
      );

      // Only touch the visible cache while the owning session is still current.
      // (After logout the account's cache was removed anyway.)
      try {
        assertSessionOwnerCurrent(owner);
      } catch {
        return;
      }
      queryClient.setQueryData(messagesKey, (old: MessageCache | undefined) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.clientMessageId === stableClientMessageId &&
              !isServerConfirmed(item)
                ? { ...item, sendStatus: 'failed' }
                : item
            ),
          })),
        };
      });
    },

    onSuccess: (serverMessage, variables, context) => {
      if (!context) return;
      const { outboxAccountId, stableClientMessageId } = context;

      // Genuine confirmation: the durable entries are no longer needed.
      useMessageOutboxStore
        .getState()
        .remove(outboxAccountId, variables.conversationId, stableClientMessageId);
      if (variables.clientUploadId) {
        discardUploadOperation(outboxAccountId, variables.clientUploadId);
      }

      queryClient.setQueryData(
        accountQueryKeys.messages(outboxAccountId, variables.conversationId),
        (old: MessageCache | undefined) => {
          if (!old?.pages) return old;

          // Replace the placeholder with the server-confirmed message, and drop
          // any duplicate of it (e.g. the socket delivered it first).
          const seen = new Set<string>();
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items
                .map((item) =>
                  item.id === context.optimisticMessage.id ||
                  item.clientMessageId === stableClientMessageId ||
                  item.clientMessageId === serverMessage.clientMessageId
                    ? serverMessage
                    : item
                )
                .filter((item) => {
                  if (item.id !== serverMessage.id) return true;
                  if (seen.has(item.id)) return false;
                  seen.add(item.id);
                  return true;
                }),
            })),
          };
        }
      );

      // Invalidate conversations list so latest preview updates
      queryClient.invalidateQueries({
        queryKey: accountQueryKeys.conversations(outboxAccountId),
      });
    },
  });
}

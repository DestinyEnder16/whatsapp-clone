// src/features/chat/api/useSendMessage.ts
import { accountQueryKeys } from '@/core/lib/accountQuery';
import { useAuthStore } from '@/core/store/useAuthStore';
import { api } from '@/services/api/client';
import type { components } from '@/services/api/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type MessageDto = components['schemas']['MessageResponseDto'];
export type LocalMessageDto = MessageDto & {
  sendStatus?: 'pending' | 'failed';
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
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      text,
      attachmentMediaIds,
      clientMessageId: providedClientMessageId,
    }: SendMessageVariables) => {
      const clientMessageId =
        providedClientMessageId || generateClientMessageId();

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
        }
      );

      if (error) {
        throw new Error((error as any)?.message || 'Failed to send message');
      }

      return data as MessageDto;
    },

    // Optimistic Update implementation
    onMutate: async ({
      conversationId,
      text,
      attachmentMediaIds,
      clientMessageId,
    }) => {
      await queryClient.cancelQueries({
        queryKey: accountQueryKeys.messages(
          useAuthStore.getState().user?.id || 'none',
          conversationId
        ),
      });

      const accountId = useAuthStore.getState().user?.id || 'none';
      const messagesKey = accountQueryKeys.messages(accountId, conversationId);

      const previousMessages =
        queryClient.getQueryData<MessageCache>(messagesKey);

      const currentUserId = useAuthStore.getState().user?.id || 'me';
      const stableClientMessageId =
        clientMessageId || generateClientMessageId();

      const optimisticMessage: LocalMessageDto = {
        id: `optimistic-${stableClientMessageId}`,
        conversationId,
        clientMessageId: stableClientMessageId,
        senderId: currentUserId,
        kind: attachmentMediaIds?.length ? 'image' : 'text',
        text: text || '',
        attachments: [],
        createdAt: new Date().toISOString(),
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

      return { previousMessages, optimisticMessage, stableClientMessageId };
    },

    onError: (_err, variables, context) => {
      queryClient.setQueryData(
        accountQueryKeys.messages(
          useAuthStore.getState().user?.id || 'none',
          variables.conversationId
        ),
        (old: MessageCache | undefined) => {
          if (!old?.pages || !context?.stableClientMessageId) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.clientMessageId === context.stableClientMessageId
                  ? { ...item, sendStatus: 'failed' }
                  : item
              ),
            })),
          };
        }
      );
    },

    onSuccess: (serverMessage, variables, context) => {
      queryClient.setQueryData(
        accountQueryKeys.messages(
          useAuthStore.getState().user?.id || 'none',
          variables.conversationId
        ),
        (old: MessageCache | undefined) => {
          if (!old?.pages) return old;

          // Replace optimistic message with the server confirmed message
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === context?.optimisticMessage?.id ||
                item.clientMessageId === context?.stableClientMessageId ||
                item.clientMessageId === serverMessage.clientMessageId
                  ? serverMessage
                  : item
              ),
            })),
          };
        }
      );

      // Invalidate conversations list so latest preview updates
      queryClient.invalidateQueries({
        queryKey: accountQueryKeys.conversations(
          useAuthStore.getState().user?.id || 'none'
        ),
      });
    },
  });
}

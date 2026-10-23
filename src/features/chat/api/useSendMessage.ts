// src/features/chat/api/useSendMessage.ts
import { useAuthStore } from '@/core/store/useAuthStore';
import { api } from '@/services/api/client';
import type { components } from '@/services/api/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type MessageDto = components['schemas']['MessageResponseDto'];

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
    onMutate: async ({ conversationId, text, clientMessageId }) => {
      await queryClient.cancelQueries({
        queryKey: ['messages', conversationId],
      });

      const previousMessages = queryClient.getQueryData<{
        items: MessageDto[];
        pageInfo: any;
      }>(['messages', conversationId]);

      const currentUserId = useAuthStore.getState().user?.id || 'me';
      const stableClientMessageId =
        clientMessageId || generateClientMessageId();

      const optimisticMessage: MessageDto = {
        id: `optimistic-${stableClientMessageId}`,
        conversationId,
        clientMessageId: stableClientMessageId,
        senderId: currentUserId,
        kind: 'text',
        text: text || '',
        attachments: [],
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData(
        ['messages', conversationId],
        (old: { items: MessageDto[]; pageInfo: any } | undefined) => {
          if (!old) {
            return {
              items: [optimisticMessage],
              pageInfo: { nextCursor: null, hasNextPage: false },
            };
          }

          return {
            ...old,
            items: [...old.items, optimisticMessage],
          };
        }
      );

      return { previousMessages, optimisticMessage, stableClientMessageId };
    },

    onError: (_err, variables, context) => {
      queryClient.setQueryData(
        ['messages', variables.conversationId],
        (old: { items: MessageDto[]; pageInfo: any } | undefined) => {
          if (!old?.items || !context?.stableClientMessageId) return old;
          return {
            ...old,
            items: old.items.filter(
              (item) => item.clientMessageId !== context.stableClientMessageId
            ),
          };
        }
      );
    },

    onSuccess: (serverMessage, variables, context) => {
      queryClient.setQueryData(
        ['messages', variables.conversationId],
        (old: { items: MessageDto[]; pageInfo: any } | undefined) => {
          if (!old?.items) return old;

          // Replace optimistic message with the server confirmed message
          const updatedItems = old.items.map((item) =>
            item.id === context?.optimisticMessage?.id ||
            item.clientMessageId === context?.stableClientMessageId ||
            item.clientMessageId === serverMessage.clientMessageId
              ? serverMessage
              : item
          );

          return {
            ...old,
            items: updatedItems,
          };
        }
      );

      // Invalidate conversations list so latest preview updates
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

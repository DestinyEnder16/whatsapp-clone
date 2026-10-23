// src/features/chat/api/useSendMessage.ts
import { useAuthStore } from "@/core/store/useAuthStore";
import { api } from "@/services/api/client";
import type { components } from "@/services/api/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type MessageDto = components["schemas"]["MessageResponseDto"];

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface SendMessageVariables {
  conversationId: string;
  text?: string;
  attachmentMediaIds?: string[];
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      text,
      attachmentMediaIds,
    }: SendMessageVariables) => {
      const clientMessageId = generateUUID();

      const { data, error } = await api.POST(
        "/v1/conversations/{conversationId}/messages",
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
        throw new Error(
          (error as any)?.message || "Failed to send message"
        );
      }

      return data as MessageDto;
    },

    // Optimistic Update implementation
    onMutate: async ({ conversationId, text }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", conversationId] });

      const previousMessages = queryClient.getQueryData<{
        items: MessageDto[];
        pageInfo: any;
      }>(["messages", conversationId]);

      const currentUserId = useAuthStore.getState().user?.id || "me";

      const optimisticMessage: MessageDto = {
        id: `optimistic-${Date.now()}`,
        conversationId,
        clientMessageId: `temp-${Date.now()}`,
        senderId: currentUserId,
        kind: "text",
        text: text || "",
        attachments: [],
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData(
        ["messages", conversationId],
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

      return { previousMessages, optimisticMessage };
    },

    onError: (_err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages", variables.conversationId],
          context.previousMessages
        );
      }
    },

    onSuccess: (serverMessage, variables, context) => {
      queryClient.setQueryData(
        ["messages", variables.conversationId],
        (old: { items: MessageDto[]; pageInfo: any } | undefined) => {
          if (!old?.items) return old;

          // Replace optimistic message with the server confirmed message
          const updatedItems = old.items.map((item) =>
            item.id === context?.optimisticMessage?.id ||
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
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

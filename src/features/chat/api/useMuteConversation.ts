// src/features/chat/api/useMuteConversation.ts
import { api } from "@/services/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type MuteDuration = "8_hours" | "24_hours" | "7_days" | "always";

interface MuteConversationParams {
  conversationId: string;
  duration: MuteDuration;
}

/**
 * Mutation hook to mute push notifications for a specific conversation via API.
 */
export function useMuteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, duration }: MuteConversationParams) => {
      const { data, error } = await api.PUT(
        "/v1/conversations/{conversationId}/mute",
        {
          params: {
            path: { conversationId },
          },
          body: {
            duration,
          },
        }
      );

      if (error) {
        throw new Error(
          (error as any)?.message || "Failed to mute conversation"
        );
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({
        queryKey: ["conversation", variables.conversationId],
      });
    },
  });
}

/**
 * Mutation hook to unmute push notifications for a specific conversation via API.
 */
export function useUnmuteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data, error } = await api.DELETE(
        "/v1/conversations/{conversationId}/mute",
        {
          params: {
            path: { conversationId },
          },
        }
      );

      if (error) {
        throw new Error(
          (error as any)?.message || "Failed to unmute conversation"
        );
      }

      return data;
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({
        queryKey: ["conversation", conversationId],
      });
    },
  });
}

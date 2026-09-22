// src/features/chat/api/useMessages.ts
import { useAuthStore } from "@/core/store/useAuthStore";
import { api } from "@/services/api/client";
import type { components } from "@/services/api/schema";
import { useQuery } from "@tanstack/react-query";

export type MessageDto = components["schemas"]["MessageResponseDto"];
export type MessageHistoryResponse =
  components["schemas"]["MessageHistoryResponseDto"];

export function useMessages(conversationId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return { items: [], pageInfo: { nextCursor: null, hasNextPage: false } };

      const { data, error } = await api.GET(
        "/v1/conversations/{conversationId}/messages",
        {
          params: {
            path: { conversationId },
            query: { limit: 50 },
          },
        }
      );

      if (error) {
        throw new Error(
          (error as any)?.message || "Failed to load messages"
        );
      }

      return data as MessageHistoryResponse;
    },
    enabled: Boolean(isAuthenticated && conversationId),
    // Keep cached messages fresh for 30s so re-entering a chat is instant
    staleTime: 30_000,
    // Keep messages in cache for 10 minutes after leaving the chat
    gcTime: 10 * 60_000,
    // Show previous data immediately while refetching in the background
    placeholderData: (prev) => prev,
  });
}

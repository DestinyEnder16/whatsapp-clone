// src/features/chat/api/useReceipts.ts
import { useAuthStore } from "@/core/store/useAuthStore";
import { api } from "@/services/api/client";
import type { components } from "@/services/api/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ReceiptFrontiersResponse =
  components["schemas"]["ReceiptFrontiersResponseDto"];
export type ReceiptFrontier =
  components["schemas"]["ReceiptFrontierResponseDto"];
export type ReceiptUpdateResponse =
  components["schemas"]["ReceiptUpdateResponseDto"];

/**
 * Fetch the receipt frontiers for all participants in a conversation.
 * Contains delivered and read boundaries per participant.
 */
export function useReceipts(conversationId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ["receipts", conversationId],
    queryFn: async () => {
      if (!conversationId) {
        return { conversationId: "", items: [] } as ReceiptFrontiersResponse;
      }

      const { data, error } = await api.GET(
        "/v1/conversations/{conversationId}/receipts",
        {
          params: {
            path: { conversationId },
          },
        }
      );

      if (error) {
        throw new Error(
          (error as any)?.message || "Failed to load receipts"
        );
      }

      return data as ReceiptFrontiersResponse;
    },
    enabled: Boolean(isAuthenticated && conversationId),
    refetchInterval: 5000, // Poll every 5s while in chat room to keep blue ticks in sync
    staleTime: 3000,
  });
}

/**
 * Marks incoming messages as delivered and read up to throughMessageId.
 * Calls both the receipt boundary endpoint and the conversation read state endpoint.
 */
export function useMarkReceiptAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      throughMessageId,
    }: {
      conversationId: string;
      throughMessageId: string;
    }) => {
      // 1. Mark general conversation as read (resets unread counter)
      api
        .POST("/v1/conversations/{conversationId}/read", {
          params: { path: { conversationId } },
        })
        .catch(() => {});

      // 2. Mark delivered receipt boundary
      api
        .PUT("/v1/conversations/{conversationId}/receipts/delivered", {
          params: { path: { conversationId } },
          body: { throughMessageId },
        })
        .catch(() => {});

      // 3. Mark read receipt boundary (this updates the receipt frontier so sender sees blue ticks)
      const { data, error } = await api.PUT(
        "/v1/conversations/{conversationId}/receipts/read",
        {
          params: { path: { conversationId } },
          body: { throughMessageId },
        }
      );

      if (error) {
        throw new Error(
          (error as any)?.message || "Failed to mark receipts as read"
        );
      }

      return data as ReceiptUpdateResponse;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({
        queryKey: ["receipts", variables.conversationId],
      });
    },
  });
}

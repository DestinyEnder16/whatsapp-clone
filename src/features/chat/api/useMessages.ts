// src/features/chat/api/useMessages.ts
import { accountQueryKeys } from '@/core/lib/accountQuery';
import { useAuthStore } from '@/core/store/useAuthStore';
import { api } from '@/services/api/client';
import type { components } from '@/services/api/schema';
import { useInfiniteQuery } from '@tanstack/react-query';

export type MessageDto = components['schemas']['MessageResponseDto'];
export type MessageHistoryResponse =
  components['schemas']['MessageHistoryResponseDto'];

export function useMessages(conversationId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accountId = useAuthStore((s) => s.user?.id);

  return useInfiniteQuery({
    queryKey: accountId
      ? accountQueryKeys.messages(accountId, conversationId)
      : ['account', 'none', 'messages', conversationId],
    queryFn: async ({ pageParam }) => {
      if (!conversationId)
        return {
          items: [],
          pageInfo: { nextCursor: null, hasNextPage: false },
        };

      const { data, error } = await api.GET(
        '/v1/conversations/{conversationId}/messages',
        {
          params: {
            path: { conversationId },
            query: { limit: 50, cursor: pageParam || undefined },
          },
        }
      );

      if (error) {
        throw new Error((error as any)?.message || 'Failed to load messages');
      }

      return data as MessageHistoryResponse;
    },
    enabled: Boolean(isAuthenticated && accountId && conversationId),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.nextCursor : undefined,
    // Keep cached messages fresh for 30s so re-entering a chat is instant
    staleTime: 30_000,
    // Keep messages in cache for 10 minutes after leaving the chat
    gcTime: 10 * 60_000,
    // Show previous data immediately while refetching in the background
  });
}

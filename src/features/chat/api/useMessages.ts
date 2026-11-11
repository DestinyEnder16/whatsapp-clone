// src/features/chat/api/useMessages.ts
import { accountQueryKeys } from '@/core/lib/accountQuery';
import { useAuthStore } from '@/core/store/useAuthStore';
import { api } from '@/services/api/client';
import type { components } from '@/services/api/schema';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useMessageOutboxStore } from '../store/useMessageOutboxStore';
import type { LocalMessageDto } from './useSendMessage';

export type MessageDto = components['schemas']['MessageResponseDto'];
export type MessageHistoryResponse =
  components['schemas']['MessageHistoryResponseDto'];

export function useMessages(conversationId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accountId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const outboxMessages = useMessageOutboxStore((state) => state.messages);

  const query = useInfiniteQuery({
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

  useEffect(() => {
    if (!accountId || !conversationId || !query.data) return;

    const pendingMessages = Object.values(outboxMessages).filter(
      (message) =>
        message.accountId === accountId &&
        message.conversationId === conversationId
    );
    if (pendingMessages.length === 0) return;

    queryClient.setQueryData(
      accountQueryKeys.messages(accountId, conversationId),
      (old: typeof query.data | undefined) => {
        if (!old?.pages?.length) return old;

        const existingIds = new Set(
          old.pages.flatMap((page) =>
            page.items.map((item) => item.clientMessageId)
          )
        );
        const missingMessages = pendingMessages
          .filter((message) => !existingIds.has(message.clientMessageId))
          .map((message) => ({
            id: `optimistic-${message.clientMessageId}`,
            conversationId: message.conversationId,
            clientMessageId: message.clientMessageId,
            senderId: accountId,
            kind: message.attachmentMediaIds?.length ? 'image' : 'text',
            text: message.text || '',
            attachments: [],
            attachmentMediaIds: message.attachmentMediaIds,
            createdAt: message.createdAt,
            // A pending operation did not finish before the previous process ended.
            sendStatus:
              message.status === 'pending' ? 'failed' : message.status,
          })) as LocalMessageDto[];

        if (missingMessages.length === 0) return old;
        return {
          ...old,
          pages: [
            {
              ...old.pages[0],
              items: [...old.pages[0].items, ...missingMessages],
            },
            ...old.pages.slice(1),
          ],
        };
      }
    );
  }, [accountId, conversationId, outboxMessages, query.data, queryClient]);

  return query;
}

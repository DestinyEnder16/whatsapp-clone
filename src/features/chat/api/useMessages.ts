// src/features/chat/api/useMessages.ts
import { accountQueryKeys } from '@/core/lib/accountQuery';
import { useAuthStore } from '@/core/store/useAuthStore';
import { api } from '@/services/api/client';
import type { components } from '@/services/api/schema';
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import {
  useMessageOutboxStore,
  type OutboxMessage,
} from '../store/useMessageOutboxStore';
import { confirmOutboxMessage } from '../utils/outboxReconciliation';
import type { LocalMessageDto } from './useSendMessage';

export type MessageDto = components['schemas']['MessageResponseDto'];
export type MessageHistoryResponse =
  components['schemas']['MessageHistoryResponseDto'];

type MessageHistory = InfiniteData<MessageHistoryResponse>;

const isPlaceholder = (message: MessageDto) =>
  message.id.startsWith('optimistic-');

/**
 * What the screen shows: server history (each message once) plus any operation
 * saved in the outbox that history does not contain yet.
 *
 * This is a local projection, computed from the durable outbox and whatever
 * history is loaded - it does not depend on history having loaded at all. After
 * a restart with an empty cache and no network, the failed/unsent messages and
 * their Retry control are still shown; when history arrives it is merged and
 * reconciled by client message id.
 */
export function projectMessages(
  history: MessageHistory | undefined,
  outbox: Record<string, OutboxMessage>,
  accountId: string | undefined,
  conversationId: string | undefined
): MessageHistory | undefined {
  const pages = history?.pages ?? [];

  // A confirmed (server) message wins over any local placeholder for the same
  // client message id, and a message id appears only once across pages.
  const confirmedClientIds = new Set<string>();
  for (const page of pages) {
    for (const item of page.items) {
      if (!isPlaceholder(item) && item.clientMessageId) {
        confirmedClientIds.add(item.clientMessageId);
      }
    }
  }
  const seenIds = new Set<string>();
  let removedDuplicates = false;
  const dedupedPages = pages.map((page) => {
    const items = page.items.filter((item) => {
      const duplicate =
        seenIds.has(item.id) ||
        (isPlaceholder(item) &&
          !!item.clientMessageId &&
          confirmedClientIds.has(item.clientMessageId));
      seenIds.add(item.id);
      if (duplicate) removedDuplicates = true;
      return !duplicate;
    });
    return items.length === page.items.length ? page : { ...page, items };
  });

  // Outbox entries for this account and room that no loaded page contains.
  const knownClientIds = new Set<string>();
  for (const page of dedupedPages) {
    for (const item of page.items) {
      if (item.clientMessageId) knownClientIds.add(item.clientMessageId);
    }
  }
  const missing: LocalMessageDto[] =
    accountId && conversationId
      ? Object.values(outbox)
          .filter(
            (entry) =>
              entry.accountId === accountId &&
              entry.conversationId === conversationId &&
              !knownClientIds.has(entry.clientMessageId)
          )
          .map((entry) => ({
            id: `optimistic-${entry.clientMessageId}`,
            conversationId: entry.conversationId,
            clientMessageId: entry.clientMessageId,
            senderId: accountId,
            kind:
              entry.attachmentMediaIds?.length || entry.upload
                ? 'image'
                : 'text',
            text: entry.text || '',
            attachments: [],
            attachmentMediaIds: entry.attachmentMediaIds,
            localMedia: entry.upload?.media,
            clientUploadId: entry.upload?.clientUploadId,
            createdAt: entry.createdAt,
            // An operation that did not finish before the previous process
            // ended is shown as failed so the user can retry it.
            sendStatus: entry.status === 'pending' ? 'failed' : entry.status,
          }))
      : [];

  if (missing.length === 0 && !removedDuplicates) return history;

  if (dedupedPages.length === 0) {
    return {
      pages: [
        {
          items: missing,
          pageInfo: { nextCursor: null, hasNextPage: false },
        } as MessageHistoryResponse,
      ],
      pageParams: [null],
    };
  }

  return {
    ...history!,
    pages: [
      { ...dedupedPages[0], items: [...dedupedPages[0].items, ...missing] },
      ...dedupedPages.slice(1),
    ],
  };
}

export function useMessages(conversationId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accountId = useAuthStore((s) => s.user?.id);
  const outboxMessages = useMessageOutboxStore((state) => state.messages);

  const query = useInfiniteQuery({
    queryKey: accountId
      ? accountQueryKeys.messages(accountId, conversationId)
      : ['account', 'none', 'messages', conversationId],
    queryFn: async ({ pageParam, signal }) => {
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
          signal,
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

  // Reconcile: once the server's copy of a message is present in history (e.g.
  // after a restart where the HTTP response was lost), its outbox entry is done.
  const history = query.data;
  useEffect(() => {
    if (!accountId || !conversationId || !history) return;
    for (const page of history.pages) {
      for (const item of page.items) {
        if (!item.id.startsWith('optimistic-') && item.clientMessageId) {
          confirmOutboxMessage(accountId, conversationId, item.clientMessageId);
        }
      }
    }
  }, [accountId, conversationId, history, outboxMessages]);

  const data = useMemo(
    () => projectMessages(history, outboxMessages, accountId, conversationId),
    [history, outboxMessages, accountId, conversationId]
  );

  return { ...query, data };
}

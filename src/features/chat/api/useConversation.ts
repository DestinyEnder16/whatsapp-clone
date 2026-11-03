// src/features/chat/api/useConversation.ts
import { accountQueryKeys } from '@/core/lib/accountQuery';
import { useAuthStore } from '@/core/store/useAuthStore';
import { api } from '@/services/api/client';
import type { components, operations } from '@/services/api/schema';
import { isValidUuid } from '@/services/notifications';
import { useQuery } from '@tanstack/react-query';

export type ConversationDetailDto =
  operations['get']['responses']['200']['content']['application/json'];

export type DirectConversationDto =
  components['schemas']['DirectConversationResponseDto'];

export type GroupConversationDto =
  components['schemas']['GroupConversationResponseDto'];

export interface ConversationError extends Error {
  status?: number;
  isAccessDenied?: boolean;
  isNotFound?: boolean;
  isInvalidId?: boolean;
}

export function useConversation(conversationId: string | undefined) {
  const isAuthenticated = useAuthStore((store) => store.isAuthenticated);
  const accountId = useAuthStore((store) => store.user?.id);
  const validId = isValidUuid(conversationId);

  return useQuery<ConversationDetailDto, ConversationError>({
    queryKey:
      accountId && conversationId
        ? accountQueryKeys.conversation(accountId, conversationId)
        : ['account', 'none', 'conversation', conversationId || 'none'],
    queryFn: async () => {
      if (!conversationId || !validId) {
        const err: ConversationError = new Error('Invalid conversation identifier');
        err.status = 400;
        err.isInvalidId = true;
        throw err;
      }

      const { data, error, response } = await api.GET(
        '/v1/conversations/{conversationId}',
        {
          params: {
            path: { conversationId },
          },
        }
      );

      if (error || !data) {
        const status = response?.status;
        const message =
          (error as any)?.message ||
          (status === 403
            ? 'Access denied to this conversation'
            : status === 404
              ? 'Conversation not found or deleted'
              : 'Failed to load conversation details');

        const err: ConversationError = new Error(message);
        err.status = status;
        err.isAccessDenied = status === 403;
        err.isNotFound = status === 404;
        throw err;
      }

      return data;
    },
    enabled: isAuthenticated && !!accountId && !!conversationId && validId,
    retry: (failureCount, error) => {
      // Never retry on 400, 403, 404 (client/permission errors)
      if (
        error?.status === 400 ||
        error?.status === 403 ||
        error?.status === 404 ||
        error?.isInvalidId
      ) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 60_000,
  });
}

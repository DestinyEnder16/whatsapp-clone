// src/features/chat/api/useMuteConversation.ts
import { accountQueryKeys } from '@/core/lib/accountQuery';
import { useAuthStore } from '@/core/store/useAuthStore';
import { api } from '@/services/api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type MuteDuration = '8_hours' | '24_hours' | '7_days' | 'always';

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
    mutationFn: async ({
      conversationId,
      duration,
    }: MuteConversationParams) => {
      const { data, error } = await api.PUT(
        '/v1/conversations/{conversationId}/mute',
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
          (error as any)?.message || 'Failed to mute conversation'
        );
      }

      return data;
    },
    onSuccess: (_, variables) => {
      const accountId = useAuthStore.getState().user?.id || 'none';
      queryClient.invalidateQueries({
        queryKey: accountQueryKeys.conversations(accountId),
      });
      queryClient.invalidateQueries({
        queryKey: accountQueryKeys.conversation(
          accountId,
          variables.conversationId
        ),
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
        '/v1/conversations/{conversationId}/mute',
        {
          params: {
            path: { conversationId },
          },
        }
      );

      if (error) {
        throw new Error(
          (error as any)?.message || 'Failed to unmute conversation'
        );
      }

      return data;
    },
    onSuccess: (_, conversationId) => {
      const accountId = useAuthStore.getState().user?.id || 'none';
      queryClient.invalidateQueries({
        queryKey: accountQueryKeys.conversations(accountId),
      });
      queryClient.invalidateQueries({
        queryKey: accountQueryKeys.conversation(accountId, conversationId),
      });
    },
  });
}

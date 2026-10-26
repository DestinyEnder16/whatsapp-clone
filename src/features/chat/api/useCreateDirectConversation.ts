// src/features/chat/api/useCreateDirectConversation.ts
import { accountQueryKeys } from '@/core/lib/accountQuery';
import { useAuthStore } from '@/core/store/useAuthStore';
import { api } from '@/services/api/client';
import type { components } from '@/services/api/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type DirectConversationResponseDto =
  components['schemas']['DirectConversationResponseDto'];

interface CreateDirectConversationParams {
  participantId: string;
}

/**
 * Mutation hook to create or retrieve an existing direct conversation with a registered user.
 * Calls POST /v1/conversations/direct with { participantId }.
 */
export function useCreateDirectConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ participantId }: CreateDirectConversationParams) => {
      const { data, error } = await api.POST('/v1/conversations/direct', {
        body: {
          participantId,
        },
      });

      if (error) {
        throw new Error(
          (error as any)?.message || 'Failed to create direct conversation'
        );
      }

      return data as DirectConversationResponseDto;
    },
    onSuccess: (data) => {
      // Invalidate conversations list query so the new conversation immediately appears
      const accountId = useAuthStore.getState().user?.id || 'none';
      queryClient.invalidateQueries({
        queryKey: accountQueryKeys.conversations(accountId),
      });
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: accountQueryKeys.conversation(accountId, data.id),
        });
      }
    },
  });
}

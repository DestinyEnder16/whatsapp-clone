// src/features/chat/api/useMarkAsRead.ts
import { accountQueryKeys } from '@/core/lib/accountQuery';
import { useAuthStore } from '@/core/store/useAuthStore';
import { api } from '@/services/api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data, error } = await api.POST(
        '/v1/conversations/{conversationId}/read',
        {
          params: {
            path: { conversationId },
          },
        }
      );

      if (error) {
        throw new Error(
          (error as any)?.message || 'Failed to mark conversation as read'
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountQueryKeys.conversations(
          useAuthStore.getState().user?.id || 'none'
        ),
      });
    },
  });
}

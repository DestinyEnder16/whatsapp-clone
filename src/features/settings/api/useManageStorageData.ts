import { accountQueryKeys } from '@/core/lib/accountQuery';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useConversations } from '@/features/chat/api/useConversations';
import { api } from '@/services/api/client';
import { toast } from '@/shared/utils/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface ChatStorageItemData {
  conversationId: string;
  name: string;
  phoneNumber: string;
  avatarUrl?: string | null;
  sizeFormatted: string;
  sizeBytes: number;
}

export function useManageStorageData() {
  const { data: conversations, isLoading } = useConversations();
  const chatList = useMemo<ChatStorageItemData[]>(() => {
    const list: any[] = Array.isArray(conversations)
      ? conversations
      : Array.isArray((conversations as any)?.items)
        ? (conversations as any).items
        : [];

    return list.map((conv: any, idx: number) => {
      const otherParticipant = conv?.otherParticipant;
      const name = conv?.name || otherParticipant?.displayName || 'Chat';
      const avatarUrl = conv?.avatarUrl || otherParticipant?.avatarUrl || null;
      return {
        conversationId: conv?.id || `chat-${idx}`,
        name,
        phoneNumber:
          typeof otherParticipant?.phoneNumber === 'string'
            ? otherParticipant.phoneNumber
            : '',
        avatarUrl,
        sizeFormatted: 'Unavailable',
        sizeBytes: 0,
      };
    });
  }, [conversations]);

  return { chatList, isLoading };
}

export function useClearChatStorage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await api.DELETE(
        '/v1/conversations/{conversationId}/messages',
        {
          params: { path: { conversationId } },
        }
      );
      if (error)
        throw new Error(
          (error as any)?.message || 'Failed to clear chat history'
        );
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountQueryKeys.conversations(
          useAuthStore.getState().user?.id || 'none'
        ),
      });
      toast.success('History Cleared', 'Server chat history was cleared.');
    },
    onError: (error: any) =>
      toast.error(
        'History Clear Failed',
        error.message || 'Could not clear chat history'
      ),
  });
}

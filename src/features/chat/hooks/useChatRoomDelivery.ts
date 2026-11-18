import { isSessionEndedError } from '@/core/session/sessionOwner';
import { useAuthStore } from '@/core/store/useAuthStore';
import {
  createClientUploadId,
  type SelectedMedia,
} from '@/services/media/uploadMedia';
import { toast } from '@/shared/utils/toast';
import { useCallback, useEffect, useMemo } from 'react';
import { useMarkAsRead } from '../api/useMarkAsRead';
import { useMarkReceiptAsRead, useReceipts } from '../api/useReceipts';
import {
  generateClientMessageId,
  useSendMessage,
  type LocalMessageDto,
  type MessageDto,
} from '../api/useSendMessage';

type DeliveryStatus = {
  isRead: boolean;
  isDelivered: boolean;
};

interface UseChatRoomDeliveryOptions {
  conversationId?: string;
  otherParticipantId?: string;
  latestIncomingMessageId: string | null;
}

export function useChatRoomDelivery({
  conversationId,
  otherParticipantId,
  latestIncomingMessageId,
}: UseChatRoomDeliveryOptions) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();
  const markReceiptAsRead = useMarkReceiptAsRead();
  const { data: receipts } = useReceipts(conversationId);

  useEffect(() => {
    if (!conversationId) return;

    if (latestIncomingMessageId) {
      markReceiptAsRead.mutate({
        conversationId,
        throughMessageId: latestIncomingMessageId,
      });
    } else {
      markAsReadMutation.mutate(conversationId);
    }
    // Receipt mutations intentionally run when the conversation frontier changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, latestIncomingMessageId]);

  const receiptItems = receipts?.items;
  const otherReceipt = useMemo(() => {
    if (!receiptItems) return null;
    if (otherParticipantId) {
      return (
        receiptItems.find(
          (receipt) => receipt.userId === otherParticipantId
        ) || null
      );
    }
    return (
      receiptItems.find((receipt) => receipt.userId !== currentUserId) || null
    );
  }, [receiptItems, otherParticipantId, currentUserId]);

  const sendText = useCallback(
    (text: string, onSuccess?: () => void) => {
      if (!conversationId || !text.trim()) return;

      sendMessageMutation.mutate(
        {
          conversationId,
          text: text.trim(),
          clientMessageId: generateClientMessageId(),
        },
        {
          onSuccess: onSuccess,
          onError: (error: any) => {
            // A send stopped because the session ended is not an error for
            // whoever is signed in now.
            if (isSessionEndedError(error)) return;
            toast.error('Error', error?.message || 'Failed to send message');
          },
        }
      );
    },
    [conversationId, sendMessageMutation]
  );

  // A photo is one operation: the upload runs inside the send mutation, under
  // the same session owner, and is saved durably (message outbox + upload
  // operation) from the moment it is chosen. If any stage fails the bubble
  // stays visible as "failed" and Retry resumes from the stage that failed.
  const sendPhoto = useCallback(
    (media: SelectedMedia) => {
      if (!conversationId) return;

      toast.info('Attachment', 'Uploading media...');
      sendMessageMutation.mutate(
        {
          conversationId,
          media,
          clientUploadId: createClientUploadId(),
          clientMessageId: generateClientMessageId(),
        },
        {
          onError: (error: any) => {
            if (isSessionEndedError(error)) return;
            toast.error(
              'Attachment Send Failed',
              error?.message || 'Please retry the message.'
            );
          },
        }
      );
    },
    [conversationId, sendMessageMutation]
  );

  const retryMessage = useCallback(
    (message: LocalMessageDto) => {
      if (!conversationId) return;

      sendMessageMutation.mutate(
        {
          conversationId,
          text: message.text || undefined,
          attachmentMediaIds: message.attachmentMediaIds,
          // A photo whose upload had not finished resumes that upload.
          media: message.localMedia,
          clientUploadId: message.clientUploadId,
          clientMessageId: message.clientMessageId,
        },
        {
          onError: (error: any) => {
            if (isSessionEndedError(error)) return;
            toast.error('Error', error?.message || 'Failed to send message');
          },
        }
      );
    },
    [conversationId, sendMessageMutation]
  );

  const getDeliveryStatus = useCallback(
    (message: MessageDto): DeliveryStatus => {
      let isRead = false;
      let isDelivered = false;
      const isMe =
        message.senderId === currentUserId ||
        message.id.startsWith('optimistic-');
      const isPending =
        message.id.startsWith('optimistic-') ||
        message.clientMessageId?.startsWith('temp-');

      if (isMe && !isPending && otherReceipt) {
        if (otherReceipt.read) {
          if (otherReceipt.read.messageId === message.id) {
            isRead = true;
          } else {
            const messageTime = new Date(message.createdAt).getTime();
            const readTime = new Date(otherReceipt.read.at).getTime();
            isRead =
              !isNaN(messageTime) &&
              !isNaN(readTime) &&
              messageTime <= readTime;
          }
        }

        if (!isRead && otherReceipt.delivered) {
          if (otherReceipt.delivered.messageId === message.id) {
            isDelivered = true;
          } else {
            const messageTime = new Date(message.createdAt).getTime();
            const deliveredTime = new Date(otherReceipt.delivered.at).getTime();
            isDelivered =
              !isNaN(messageTime) &&
              !isNaN(deliveredTime) &&
              messageTime <= deliveredTime;
          }
        }
      }

      return { isRead, isDelivered };
    },
    [currentUserId, otherReceipt]
  );

  return {
    isSending: sendMessageMutation.isPending,
    sendText,
    sendPhoto,
    retryMessage,
    getDeliveryStatus,
  };
}

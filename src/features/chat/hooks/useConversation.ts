import { useAuthStore } from '@/core/store/useAuthStore';
import { toast } from '@/shared/utils/toast';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList } from 'react-native';
import { useMarkAsRead } from '../api/useMarkAsRead';
import { useMessages, type MessageDto } from '../api/useMessages';
import { useMarkReceiptAsRead, useReceipts } from '../api/useReceipts';
import { useSendMessage } from '../api/useSendMessage';
import { useChatRoomSocket } from './useChatRoomSocket';

export type ConversationListItem =
  | { type: 'date'; key: string; label: string }
  | { type: 'message'; key: string; message: MessageDto; isNew: boolean };

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  const suffix =
    date.getDate() === 1 || date.getDate() === 21 || date.getDate() === 31
      ? 'st'
      : date.getDate() === 2 || date.getDate() === 22
        ? 'nd'
        : date.getDate() === 3 || date.getDate() === 23
          ? 'rd'
          : 'th';
  const month = date.toLocaleString('en-US', { month: 'long' });
  return `${date.getDate()}${suffix} ${month} ${date.getFullYear()}`;
}

function getDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

interface UseConversationOptions {
  conversationId?: string;
  otherParticipantId?: string;
  fallbackStatus: string;
}

export function useConversation({
  conversationId,
  otherParticipantId,
  fallbackStatus,
}: UseConversationOptions) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { data: messageHistory, isLoading: isLoadingMessages } =
    useMessages(conversationId);
  const { data: receipts } = useReceipts(conversationId);
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();
  const markReceiptAsRead = useMarkReceiptAsRead();
  const {
    statusText,
    isRemoteTyping,
    handleInputKeystroke,
    handleMessageSent,
  } = useChatRoomSocket({
    conversationId,
    otherParticipantId,
    fallbackStatus,
  });

  const [inputText, setInputText] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const initialCountRef = useRef<number | null>(null);

  const sortedMessages = useMemo(() => {
    return [...(messageHistory?.items || [])].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messageHistory?.items]);

  useEffect(() => {
    if (initialCountRef.current === null && sortedMessages.length > 0) {
      initialCountRef.current = sortedMessages.length;
    }
  }, [sortedMessages.length]);

  const otherReceipt = useMemo(() => {
    if (!receipts?.items) return null;
    return (
      receipts.items.find((receipt) =>
        otherParticipantId
          ? receipt.userId === otherParticipantId
          : receipt.userId !== currentUserId
      ) || null
    );
  }, [currentUserId, otherParticipantId, receipts?.items]);

  const latestIncomingMessageId = useMemo(() => {
    const incoming = sortedMessages.filter(
      (message) => message.senderId && message.senderId !== currentUserId
    );
    const latest = incoming[incoming.length - 1];
    return latest && !latest.id.startsWith('optimistic-') ? latest.id : null;
  }, [currentUserId, sortedMessages]);

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
    // These mutations are stable for this lifecycle; the message frontier is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, latestIncomingMessageId]);

  const listData = useMemo<ConversationListItem[]>(() => {
    const result: ConversationListItem[] = [];
    let lastDateKey = '';
    const initialCount = initialCountRef.current ?? sortedMessages.length;

    sortedMessages.forEach((message, index) => {
      const dateKey = getDateKey(message.createdAt);
      if (dateKey && dateKey !== lastDateKey) {
        lastDateKey = dateKey;
        result.push({
          type: 'date',
          key: `date-${dateKey}`,
          label: getDateLabel(message.createdAt),
        });
      }
      result.push({
        type: 'message',
        key: `msg-${message.id}`,
        message,
        isNew: index >= initialCount,
      });
    });
    return result;
  }, [sortedMessages]);

  useEffect(() => {
    if (listData.length === 0) return;
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [listData.length]);

  const handleInputChange = (text: string) => {
    setInputText(text);
    handleInputKeystroke();
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !conversationId) return;
    const text = inputText.trim();
    setInputText('');
    handleMessageSent();

    sendMessageMutation.mutate(
      { conversationId, text },
      {
        onSuccess: () => {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 150);
        },
        onError: (error: any) => {
          toast.error('Error', error?.message || 'Failed to send message');
        },
      }
    );
  };

  const handleSendPhoto = () => {
    toast.info('Attachment', 'Uploading media...');
  };

  return {
    currentUserId,
    isLoadingMessages,
    sortedMessages,
    listData,
    otherReceipt,
    isRemoteTyping,
    statusText,
    inputText,
    showAttachmentMenu,
    setShowAttachmentMenu,
    flatListRef,
    isSending: sendMessageMutation.isPending,
    handleInputChange,
    handleSendMessage,
    handleSendPhoto,
  };
}

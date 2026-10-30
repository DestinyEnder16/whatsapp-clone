// src/features/chat/hooks/useChatRoomSocket.ts
import { useAuthStore } from '@/core/store/useAuthStore';
import { useSocketStore } from '@/core/store/useSocketStore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatLastActive } from '../utils/formatLastActive';

interface UseChatRoomSocketOptions {
  conversationId?: string;
  otherParticipantId?: string;
  fallbackStatus?: string;
}

export function useChatRoomSocket({
  conversationId,
  otherParticipantId,
  fallbackStatus = 'Status unavailable',
}: UseChatRoomSocketOptions) {
  const isConnected = useSocketStore((s) => s.isConnected);
  const onlineUsers = useSocketStore((s) => s.onlineUsers);
  const typingUsers = useSocketStore((s) => s.typingUsers);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const joinConversation = useSocketStore((s) => s.joinConversation);
  const leaveConversation = useSocketStore((s) => s.leaveConversation);
  const emitTypingStart = useSocketStore((s) => s.emitTypingStart);
  const emitTypingStop = useSocketStore((s) => s.emitTypingStop);
  const subscribePresence = useSocketStore((s) => s.subscribePresence);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCurrentlyTypingRef = useRef(false);
  const [typingExpiryTick, setTypingExpiryTick] = useState(0);

  // Join exactly once for each connected conversation and leave on room changes.
  useEffect(() => {
    if (!conversationId || !isConnected) return;

    joinConversation(conversationId);

    if (otherParticipantId) {
      subscribePresence({
        userIds: [otherParticipantId],
        conversationId,
      });
    }

    return () => {
      if (isCurrentlyTypingRef.current) {
        emitTypingStop(conversationId);
        isCurrentlyTypingRef.current = false;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      leaveConversation(conversationId);
    };
  }, [
    isConnected,
    conversationId,
    otherParticipantId,
    joinConversation,
    leaveConversation,
    subscribePresence,
    emitTypingStop,
  ]);

  // Debounced handler to notify when this user is typing
  const handleInputKeystroke = useCallback(() => {
    if (!conversationId) return;

    if (!isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = true;
      emitTypingStart(conversationId);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop(conversationId);
      isCurrentlyTypingRef.current = false;
    }, 2500);
  }, [conversationId, emitTypingStart, emitTypingStop]);

  const handleMessageSent = useCallback(() => {
    if (!conversationId) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isCurrentlyTypingRef.current) {
      emitTypingStop(conversationId);
      isCurrentlyTypingRef.current = false;
    }
  }, [conversationId, emitTypingStop]);

  // Remote typing & presence state calculation
  const typingInfo = conversationId ? typingUsers[conversationId] : undefined;
  useEffect(() => {
    if (!typingInfo?.isTyping) return;
    const remaining = Math.max(0, typingInfo.timestamp + 4000 - Date.now());
    const timer = setTimeout(
      () => setTypingExpiryTick((tick) => tick + 1),
      remaining
    );
    return () => clearTimeout(timer);
  }, [typingInfo?.isTyping, typingInfo?.timestamp]);

  const isRemoteTyping = useMemo(() => {
    void typingExpiryTick;
    if (!typingInfo) return false;
    if (!typingInfo.isTyping || typingInfo.userId === currentUserId)
      return false;
    if (
      otherParticipantId &&
      typingInfo.userId &&
      typingInfo.userId !== otherParticipantId
    ) {
      return false;
    }
    const isRecent = Date.now() - typingInfo.timestamp < 4000;
    return isRecent;
  }, [currentUserId, otherParticipantId, typingExpiryTick, typingInfo]);

  const participantPresence = otherParticipantId
    ? onlineUsers[otherParticipantId]
    : undefined;

  const statusText = useMemo(() => {
    return formatLastActive({
      isOnline: participantPresence?.isOnline,
      isTyping: isRemoteTyping,
      lastActiveAt: participantPresence?.lastActiveAt,
      fallback: fallbackStatus,
    });
  }, [participantPresence, isRemoteTyping, fallbackStatus]);

  return {
    isConnected,
    isRemoteTyping,
    statusText,
    isOnline: Boolean(participantPresence?.isOnline),
    handleInputKeystroke,
    handleMessageSent,
  };
}

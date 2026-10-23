// src/features/chat/hooks/useChatRoomSocket.ts
import { useSocketStore } from "@/core/store/useSocketStore";
import { formatLastActive } from "../utils/formatLastActive";
import { useCallback, useEffect, useMemo, useRef } from "react";

interface UseChatRoomSocketOptions {
  conversationId?: string;
  otherParticipantId?: string;
  fallbackStatus?: string;
}

export function useChatRoomSocket({
  conversationId,
  otherParticipantId,
  fallbackStatus = "Active recently",
}: UseChatRoomSocketOptions) {
  const isConnected = useSocketStore((s) => s.isConnected);
  const onlineUsers = useSocketStore((s) => s.onlineUsers);
  const typingUsers = useSocketStore((s) => s.typingUsers);

  const joinConversation = useSocketStore((s) => s.joinConversation);
  const leaveConversation = useSocketStore((s) => s.leaveConversation);
  const emitTypingStart = useSocketStore((s) => s.emitTypingStart);
  const emitTypingStop = useSocketStore((s) => s.emitTypingStop);
  const subscribePresence = useSocketStore((s) => s.subscribePresence);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCurrentlyTypingRef = useRef(false);

  // 1. Join room and subscribe to presence on mount
  useEffect(() => {
    if (!conversationId) return;

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
    conversationId,
    otherParticipantId,
    joinConversation,
    leaveConversation,
    subscribePresence,
    emitTypingStop,
  ]);

  // Re-join if connection drops and reconnects
  useEffect(() => {
    if (isConnected && conversationId) {
      joinConversation(conversationId);
      if (otherParticipantId) {
        subscribePresence({
          userIds: [otherParticipantId],
          conversationId,
        });
      }
    }
  }, [isConnected, conversationId, otherParticipantId, joinConversation, subscribePresence]);

  // 2. Debounced handler to notify when this user is typing
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

  // 3. Remote typing & presence state calculation
  const typingInfo = conversationId ? typingUsers[conversationId] : undefined;
  const isRemoteTyping = useMemo(() => {
    if (!typingInfo) return false;
    const isRecent = Date.now() - typingInfo.timestamp < 4000;
    return Boolean(typingInfo.isTyping && isRecent);
  }, [typingInfo]);

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

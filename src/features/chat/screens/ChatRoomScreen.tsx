// src/features/chat/screens/ChatRoomScreen.tsx
import { useAuthStore } from "@/core/store/useAuthStore";
import { useAppTheme } from "@/shared/hooks";
import { toast } from "@/shared/utils/toast";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMarkAsRead } from "../api/useMarkAsRead";
import { useMessages, type MessageDto } from "../api/useMessages";
import { useReceipts, useMarkReceiptAsRead } from "../api/useReceipts";
import { useSendMessage } from "../api/useSendMessage";
import { AnimatedMessageBubble } from "../components/AnimatedMessageBubble";
import { ChatAttachmentMenu } from "../components/ChatAttachmentMenu";
import { DateSeparator } from "../components/DateSeparator";
import { TypingIndicator } from "../components/TypingIndicator";
import { useChatRoomSocket } from "../hooks/useChatRoomSocket";
import { formatMessageTime } from "../utils/formatChatDate";

// --- Helpers ---

/** Format a date into a WhatsApp-style label: "Today", "Yesterday", or "19th September 2026" */
function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return "Yesterday";

  const day = date.getDate();
  const suffix =
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
      ? "nd"
      : day === 3 || day === 23
      ? "rd"
      : "th";

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return `${day}${suffix} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

/** Get a plain date key like "2026-09-22" for grouping */
function getDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Each item in the FlatList is either a date separator or a message
type ListItem =
  | { type: "date"; key: string; label: string }
  | { type: "message"; key: string; message: MessageDto; isNew: boolean };

// --- Component ---

export function ChatRoomScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    avatarUrl?: string;
    status?: string;
    otherParticipantId?: string;
  }>();

  const conversationId = params.id;
  const contactName = params.name || "Chat";
  const contactAvatar = params.avatarUrl || "";
  const initialStatus = params.status || "Active 5 minutes ago";

  // 1. Load real messages via REST + TanStack Query cache
  const { data: messageHistory, isLoading: isLoadingMessages } =
    useMessages(conversationId);
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();

  // 2. Real-time Socket.IO room, typing, and presence hook
  const {
    statusText,
    isRemoteTyping,
    handleInputKeystroke,
    handleMessageSent,
  } = useChatRoomSocket({
    conversationId,
    otherParticipantId: params.otherParticipantId,
    fallbackStatus: initialStatus,
  });

  // 3. Receipts query for delivery & read frontiers
  const { data: receipts } = useReceipts(conversationId);
  const markReceiptAsRead = useMarkReceiptAsRead();

  const [inputText, setInputText] = useState("");
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Track the count of messages at first load so we can tell new from old
  const initialCountRef = useRef<number | null>(null);

  // Sort messages chronologically (oldest first for display top-to-bottom)
  const sortedMessages = useMemo(() => {
    if (!messageHistory?.items) return [];
    const items = [...messageHistory.items];
    items.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return items;
  }, [messageHistory?.items]);

  // Record the initial message count on first load
  useEffect(() => {
    if (initialCountRef.current === null && sortedMessages.length > 0) {
      initialCountRef.current = sortedMessages.length;
    }
  }, [sortedMessages.length]);

  // The other participant's receipt frontier (for blue double ticks)
  const otherReceipt = useMemo(() => {
    if (!receipts?.items) return null;
    if (params.otherParticipantId) {
      return (
        receipts.items.find((r) => r.userId === params.otherParticipantId) || null
      );
    }
    return receipts.items.find((r) => r.userId !== currentUserId) || null;
  }, [receipts?.items, params.otherParticipantId, currentUserId]);

  // Find latest incoming message ID from the other user
  const latestIncomingMessageId = useMemo(() => {
    const incoming = sortedMessages.filter(
      (m) => m.senderId && m.senderId !== currentUserId
    );
    const last = incoming[incoming.length - 1];
    return last && !last.id.startsWith("optimistic-") ? last.id : null;
  }, [sortedMessages, currentUserId]);

  // Mark incoming messages as read when opening room and whenever new incoming messages arrive
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, latestIncomingMessageId]);

  // Build the flat list data with date separators interleaved
  const listData: ListItem[] = useMemo(() => {
    const result: ListItem[] = [];
    let lastDateKey = "";
    const initialCount = initialCountRef.current ?? sortedMessages.length;

    sortedMessages.forEach((msg, index) => {
      // Insert date separator if the day changed
      const dateKey = getDateKey(msg.createdAt);
      if (dateKey && dateKey !== lastDateKey) {
        lastDateKey = dateKey;
        result.push({
          type: "date",
          key: `date-${dateKey}`,
          label: getDateLabel(msg.createdAt),
        });
      }

      // Messages beyond the initial load count are "new" (arrived live)
      const isNew = index >= initialCount;

      result.push({
        type: "message",
        key: `msg-${msg.id}`,
        message: msg,
        isNew,
      });
    });

    return result;
  }, [sortedMessages]);

  // Auto-scroll to bottom whenever new items arrive
  useEffect(() => {
    if (listData.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [listData.length]);

  // 4. Send message handler with optimistic updates
  const handleSendMessage = () => {
    if (!inputText.trim() || !conversationId) return;

    const textToSend = inputText.trim();
    setInputText("");
    handleMessageSent();

    sendMessageMutation.mutate(
      {
        conversationId,
        text: textToSend,
      },
      {
        onSuccess: () => {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 150);
        },
        onError: (err: any) => {
          toast.error("Error", err?.message || "Failed to send message");
        },
      }
    );
  };

  const handleSendPhoto = (uri: string) => {
    if (!conversationId) return;
    toast.info("Attachment", "Uploading media...");
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: isDark ? colors.background : "#F4F7F9" }}
    >
      <StatusBar style="light" />

      {/* Top Green Header */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingTop: insets.top + 6,
          paddingBottom: 14,
          paddingHorizontal: 16,
        }}
        className="flex-row items-center justify-between shadow-sm"
      >
        {/* Left: Back Button + Contact Info */}
        <View className="flex-row items-center flex-1 mr-2">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="w-9 h-9 items-center justify-center mr-1 active:opacity-75"
          >
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </Pressable>

          <View className="w-10 h-10 rounded-full overflow-hidden items-center justify-center mr-3 border border-white/30 bg-white/20">
            {contactAvatar ? (
              <Image
                source={{ uri: contactAvatar }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <Text
                className="text-white text-[16px]"
                style={{ fontFamily: "SFPRODISPLAYBOLD" }}
              >
                {contactName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          {/* Name & Dynamic Status */}
          <View className="flex-1">
            <Text
              className="text-white text-[17px]"
              style={{ fontFamily: "SFPRODISPLAYBOLD" }}
              numberOfLines={1}
            >
              {contactName}
            </Text>
            <Text
              className={`text-[12px] mt-0.5 ${
                statusText === "Typing..."
                  ? "text-white font-semibold"
                  : "text-white/80"
              }`}
              style={{ fontFamily: "SFPRODISPLAYREGULAR" }}
              numberOfLines={1}
            >
              {statusText}
            </Text>
          </View>
        </View>

        {/* Right: Video & Call Icons */}
        <View className="flex-row items-center space-x-3">
          <Pressable
            onPress={() =>
              toast.info("Video Call", `Starting video call with ${contactName}`)
            }
            hitSlop={8}
            className="w-9 h-9 items-center justify-center active:opacity-75"
          >
            <Ionicons name="videocam" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={() =>
              toast.info("Voice Call", `Starting call with ${contactName}`)
            }
            hitSlop={8}
            className="w-9 h-9 items-center justify-center active:opacity-75 ml-1"
          >
            <Ionicons name="call" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Messages List Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {isLoadingMessages && sortedMessages.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text
              className="text-[13px] mt-2"
              style={{ color: colors.textMuted }}
            >
              Loading messages...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={listData}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingVertical: 16,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View className="flex-1 items-center justify-center py-12">
                <View
                  className="px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                  }}
                >
                  <Text
                    className="text-[13px]"
                    style={{ color: colors.textMuted }}
                  >
                    No messages yet. Send a message to start chatting!
                  </Text>
                </View>
              </View>
            )}
            renderItem={({ item }) => {
              if (item.type === "date") {
                return <DateSeparator label={item.label} />;
              }

              const msg = item.message;
              const isMe =
                msg.senderId === currentUserId ||
                msg.id.startsWith("optimistic-");
              const isPending =
                msg.id.startsWith("optimistic-") ||
                msg.clientMessageId?.startsWith("temp-");
              const firstAttachment = (msg.attachments as any)?.[0];
              const imageUri = firstAttachment?.url || null;

              // Read / delivery receipt determination for sent messages:
              let isRead = false;
              let isDelivered = false;

              if (isMe && !isPending && otherReceipt) {
                if (otherReceipt.read) {
                  if (otherReceipt.read.messageId === msg.id) {
                    isRead = true;
                  } else {
                    const msgTime = new Date(msg.createdAt).getTime();
                    const readTime = new Date(otherReceipt.read.at).getTime();
                    if (!isNaN(msgTime) && !isNaN(readTime) && msgTime <= readTime) {
                      isRead = true;
                    }
                  }
                }

                if (!isRead && otherReceipt.delivered) {
                  if (otherReceipt.delivered.messageId === msg.id) {
                    isDelivered = true;
                  } else {
                    const msgTime = new Date(msg.createdAt).getTime();
                    const deliveredTime = new Date(otherReceipt.delivered.at).getTime();
                    if (!isNaN(msgTime) && !isNaN(deliveredTime) && msgTime <= deliveredTime) {
                      isDelivered = true;
                    }
                  }
                }
              }

              return (
                <AnimatedMessageBubble
                  id={msg.id}
                  text={msg.text}
                  time={formatMessageTime(msg.createdAt)}
                  isMe={isMe}
                  imageUri={imageUri}
                  isPending={isPending}
                  animate={item.isNew}
                  isRead={isRead}
                  isDelivered={isDelivered}
                />
              );
            }}
            ListFooterComponent={() =>
              isRemoteTyping ? <TypingIndicator /> : null
            }
          />
        )}

        {/* Bottom Message Input Bar */}
        <View
          className="flex-row items-center px-4 py-3 border-t"
          style={{
            backgroundColor: isDark ? colors.surface : "#FFFFFF",
            borderColor: colors.divider,
            paddingBottom: Math.max(insets.bottom, 12),
          }}
        >
          <Pressable
            onPress={() => setShowAttachmentMenu(true)}
            hitSlop={8}
            className="w-10 h-10 items-center justify-center mr-1 active:opacity-75"
          >
            <Ionicons name="attach" size={24} color={colors.textMuted} />
          </Pressable>

          <View
            className="flex-1 flex-row items-center px-4 py-2.5 rounded-full mr-2 border"
            style={{
              backgroundColor: isDark ? colors.background : "#F9FAFB",
              borderColor: colors.border,
            }}
          >
            <TextInput
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                handleInputKeystroke();
              }}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              className="flex-1 text-[15px] max-h-24"
              style={{
                color: colors.text,
                fontFamily: "SFPRODISPLAYREGULAR",
              }}
              multiline
            />
          </View>

          <Pressable
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sendMessageMutation.isPending}
            className="w-11 h-11 rounded-full items-center justify-center active:opacity-85 shadow"
            style={{
              backgroundColor: colors.primary,
              opacity: inputText.trim() ? 1 : 0.6,
            }}
          >
            <Ionicons
              name="send"
              size={19}
              color="#FFFFFF"
              style={{ marginLeft: 2 }}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ChatAttachmentMenu
        visible={showAttachmentMenu}
        onClose={() => setShowAttachmentMenu(false)}
        onSelectPhoto={handleSendPhoto}
      />
    </View>
  );
}

export default ChatRoomScreen;

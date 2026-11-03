// src/features/chat/screens/ChatRoomScreen.tsx
import { useAuthStore } from '@/core/store/useAuthStore';
import { uploadMedia, type SelectedMedia } from '@/services/media/uploadMedia';
import { isValidUuid } from '@/services/notifications';
import { Button } from '@/shared/components';
import { useAppTheme } from '@/shared/hooks';
import { toast } from '@/shared/utils/toast';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConversation } from '../api/useConversation';
import { useMarkAsRead } from '../api/useMarkAsRead';
import { useMessages, type MessageDto } from '../api/useMessages';
import { useMarkReceiptAsRead, useReceipts } from '../api/useReceipts';
import { generateClientMessageId, useSendMessage } from '../api/useSendMessage';
import { AnimatedMessageBubble } from '../components/AnimatedMessageBubble';
import { ChatAttachmentMenu } from '../components/ChatAttachmentMenu';
import { DateSeparator } from '../components/DateSeparator';
import { TypingIndicator } from '../components/TypingIndicator';
import { useChatRoomSocket } from '../hooks/useChatRoomSocket';
import { useChatDraftStore } from '../store/useChatDraftStore';
import { formatMessageTime } from '../utils/formatChatDate';

// --- Helpers ---

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return 'Yesterday';

  const day = date.getDate();
  const suffix =
    day === 1 || day === 21 || day === 31
      ? 'st'
      : day === 2 || day === 22
        ? 'nd'
        : day === 3 || day === 23
          ? 'rd'
          : 'th';

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return `${day}${suffix} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function getDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

type ListItem =
  | { type: 'date'; key: string; label: string }
  | { type: 'message'; key: string; message: MessageDto; isNew: boolean };

export function ChatRoomScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const params = useLocalSearchParams<{
    id?: string;
  }>();

  const conversationId = params.id;
  const isIdValid = isValidUuid(conversationId);

  // Safe back navigation fallback: if opened via cold deep link/notification with no history, go to (tabs)
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  // 1. Authoritative conversation query (validates ID and resolves identity from backend)
  const {
    data: conversationData,
    isLoading: isLoadingConversation,
    error: conversationError,
    refetch: refetchConversation,
  } = useConversation(conversationId);

  // Derive authoritative contact information
  const otherParticipantId =
    conversationData?.type === 'direct'
      ? conversationData.otherParticipant?.id
      : undefined;

  const rawDisplayName =
    conversationData?.type === 'direct'
      ? (conversationData as any).otherParticipant?.displayName
      : undefined;

  const contactName: string =
    conversationData?.type === 'group'
      ? typeof (conversationData as any).name === 'string' &&
        (conversationData as any).name
        ? (conversationData as any).name
        : 'Group conversation'
      : typeof rawDisplayName === 'string' && rawDisplayName
        ? rawDisplayName
        : 'Conversation';

  const rawAvatar =
    conversationData?.type === 'group'
      ? (conversationData as any).avatarUrl
      : (conversationData as any)?.otherParticipant?.avatarUrl;

  const contactAvatar: string = typeof rawAvatar === 'string' ? rawAvatar : '';

  const initialStatus = 'Status unavailable';

  // 2. Load messages
  const {
    data: messagePages,
    isLoading: isLoadingMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(isIdValid ? conversationId : undefined);

  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();

  // 3. Real-time Socket.IO presence & typing
  const {
    statusText,
    isRemoteTyping,
    handleInputKeystroke,
    handleMessageSent,
  } = useChatRoomSocket({
    conversationId: isIdValid ? conversationId : undefined,
    otherParticipantId,
    fallbackStatus: initialStatus,
  });

  // 4. Receipts query
  const { data: receipts } = useReceipts(
    isIdValid ? conversationId : undefined
  );
  const markReceiptAsRead = useMarkReceiptAsRead();

  const draft = useChatDraftStore((state) =>
    currentUserId && conversationId
      ? state.drafts[`${currentUserId}:${conversationId}`] || ''
      : ''
  );
  const setDraft = useChatDraftStore((state) => state.setDraft);
  const clearDraft = useChatDraftStore((state) => state.clearDraft);
  const [inputText, setInputText] = useState(draft);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isNearBottomRef = useRef(true);

  const messageHistory = useMemo(() => {
    if (!messagePages?.pages) return undefined;
    return {
      items: messagePages.pages.flatMap((page) => page.items),
      pageInfo: messagePages.pages[messagePages.pages.length - 1].pageInfo,
    };
  }, [messagePages]);

  useEffect(() => {
    setInputText(draft);
  }, [conversationId]);

  const initialCountRef = useRef<number | null>(null);

  const sortedMessages = useMemo(() => {
    if (!messageHistory?.items) return [];
    const items = [...messageHistory.items];
    items.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return items;
  }, [messageHistory?.items]);

  useEffect(() => {
    initialCountRef.current = null;
  }, [conversationId]);

  useEffect(() => {
    if (initialCountRef.current === null && sortedMessages.length > 0) {
      initialCountRef.current = sortedMessages.length;
    }
  }, [sortedMessages.length]);

  const otherReceipt = useMemo(() => {
    if (!receipts?.items) return null;
    if (otherParticipantId) {
      return (
        receipts.items.find((r) => r.userId === otherParticipantId) || null
      );
    }
    return receipts.items.find((r) => r.userId !== currentUserId) || null;
  }, [receipts?.items, otherParticipantId, currentUserId]);

  const latestIncomingMessageId = useMemo(() => {
    const incoming = sortedMessages.filter(
      (m) => m.senderId && m.senderId !== currentUserId
    );
    const last = incoming[incoming.length - 1];
    return last && !last.id.startsWith('optimistic-') ? last.id : null;
  }, [sortedMessages, currentUserId]);

  useEffect(() => {
    if (!conversationId || !isIdValid) return;

    if (latestIncomingMessageId) {
      markReceiptAsRead.mutate({
        conversationId,
        throughMessageId: latestIncomingMessageId,
      });
    } else {
      markAsReadMutation.mutate(conversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, latestIncomingMessageId, isIdValid]);

  const listData: ListItem[] = useMemo(() => {
    const result: ListItem[] = [];
    let lastDateKey = '';
    const initialCount = initialCountRef.current ?? sortedMessages.length;

    sortedMessages.forEach((msg, index) => {
      const dateKey = getDateKey(msg.createdAt);
      if (dateKey && dateKey !== lastDateKey) {
        lastDateKey = dateKey;
        result.push({
          type: 'date',
          key: `date-${dateKey}`,
          label: getDateLabel(msg.createdAt),
        });
      }

      const isNew = index >= initialCount;

      result.push({
        type: 'message',
        key: `msg-${msg.id}`,
        message: msg,
        isNew,
      });
    });

    return result;
  }, [sortedMessages]);

  useEffect(() => {
    if (listData.length === 0 || !isNearBottomRef.current) return;
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [isRemoteTyping, listData.length]);

  const handleListScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);
    isNearBottomRef.current = distanceFromBottom < 80;

    if (contentOffset.y < 80 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !conversationId || !isIdValid) return;

    const textToSend = inputText.trim();
    setInputText('');
    if (currentUserId) clearDraft(currentUserId, conversationId);
    handleMessageSent();

    sendMessageMutation.mutate(
      {
        conversationId,
        text: textToSend,
        clientMessageId: generateClientMessageId(),
      },
      {
        onSuccess: () => {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 150);
        },
        onError: (err: any) => {
          toast.error('Error', err?.message || 'Failed to send message');
        },
      }
    );
  };

  const handleSendPhoto = async (media: SelectedMedia) => {
    if (!conversationId || !isIdValid) return;

    try {
      toast.info('Attachment', 'Uploading media...');
      const completedMedia = await uploadMedia(media, 'message_attachment');

      sendMessageMutation.mutate(
        {
          conversationId,
          attachmentMediaIds: [completedMedia.id],
          clientMessageId: generateClientMessageId(),
        },
        {
          onError: (error: any) => {
            toast.error(
              'Attachment Send Failed',
              error?.message || 'Please retry the message.'
            );
          },
        }
      );
    } catch (error: any) {
      toast.error('Error', error?.message || 'Failed to send photo');
    }
  };

  // --- Recovery Screens for Invalid, Inaccessible, or Missing Conversations ---

  // Do not render a placeholder identity while the route ID is being resolved.
  if (isLoadingConversation && !conversationData) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{
          backgroundColor: isDark ? colors.background : '#F4F7F9',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
        accessibilityRole="progressbar"
        accessibilityLabel="Loading conversation details"
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          className="text-[15px] mt-4"
          style={{ color: colors.textSecondary }}
        >
          Loading conversation...
        </Text>
      </View>
    );
  }

  // 1. Invalid ID recovery screen
  if (!conversationId || !isIdValid) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{
          backgroundColor: isDark ? colors.background : '#F4F7F9',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View
          className="w-16 h-16 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)' }}
        >
          <Ionicons name="alert-circle" size={36} color="#EF4444" />
        </View>
        <Text
          className="text-[20px] font-bold text-center mb-2"
          style={{ color: colors.text }}
          accessibilityRole="header"
        >
          Invalid Conversation Link
        </Text>
        <Text
          className="text-[14px] text-center mb-6 leading-5"
          style={{ color: colors.textSecondary }}
        >
          The conversation link is invalid or malformed. Please verify the URL
          or select an existing chat from your conversations list.
        </Text>
        <Button
          title="Back to Chats"
          onPress={handleBack}
          accessibilityLabel="Back to chats"
          accessibilityHint="Returns to your conversation list"
          style={{ width: '80%' }}
        />
      </View>
    );
  }

  // 2. Inaccessible / Access Denied (403) recovery screen
  if (conversationError?.isAccessDenied) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{
          backgroundColor: isDark ? colors.background : '#F4F7F9',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View
          className="w-16 h-16 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)' }}
        >
          <Ionicons name="lock-closed" size={34} color="#F59E0B" />
        </View>
        <Text
          className="text-[20px] font-bold text-center mb-2"
          style={{ color: colors.text }}
          accessibilityRole="header"
        >
          Access Denied
        </Text>
        <Text
          className="text-[14px] text-center mb-6 leading-5"
          style={{ color: colors.textSecondary }}
        >
          You do not have permission to view or participate in this
          conversation.
        </Text>
        <Button
          title="Back to Chats"
          onPress={handleBack}
          accessibilityLabel="Back to chats"
          accessibilityHint="Returns to your conversation list"
          style={{ width: '80%' }}
        />
      </View>
    );
  }

  // 3. Not Found (404) recovery screen
  if (conversationError?.isNotFound) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{
          backgroundColor: isDark ? colors.background : '#F4F7F9',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View
          className="w-16 h-16 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: 'rgba(107, 114, 128, 0.12)' }}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={34}
            color={colors.textMuted}
          />
        </View>
        <Text
          className="text-[20px] font-bold text-center mb-2"
          style={{ color: colors.text }}
          accessibilityRole="header"
        >
          Conversation Not Found
        </Text>
        <Text
          className="text-[14px] text-center mb-6 leading-5"
          style={{ color: colors.textSecondary }}
        >
          This conversation could not be found or has been removed.
        </Text>
        <View className="w-[80%] space-y-3">
          <Button
            title="Back to Chats"
            onPress={handleBack}
            accessibilityLabel="Back to chats"
            accessibilityHint="Returns to your conversation list"
          />
        </View>
      </View>
    );
  }

  // 4. General fetch error recovery screen
  if (conversationError && !conversationData) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{
          backgroundColor: isDark ? colors.background : '#F4F7F9',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View
          className="w-16 h-16 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)' }}
        >
          <Ionicons name="cloud-offline" size={34} color="#EF4444" />
        </View>
        <Text
          className="text-[20px] font-bold text-center mb-2"
          style={{ color: colors.text }}
          accessibilityRole="header"
        >
          Could Not Load Conversation
        </Text>
        <Text
          className="text-[14px] text-center mb-6 leading-5"
          style={{ color: colors.textSecondary }}
        >
          {conversationError.message ||
            'Unable to connect to the server. Please check your internet connection and try again.'}
        </Text>
        <View className="w-[80%] space-y-3">
          <Button
            title="Retry"
            onPress={() => refetchConversation()}
            accessibilityLabel="Retry loading conversation"
            accessibilityHint="Attempts to reload this conversation from the server"
          />
          <Pressable
            onPress={handleBack}
            className="py-3 items-center"
            accessibilityRole="button"
            accessibilityLabel="Back to chats"
          >
            <Text
              className="text-[15px] font-semibold"
              style={{ color: colors.primary }}
            >
              Back to Chats
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: isDark ? colors.background : '#F4F7F9' }}
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
            onPress={handleBack}
            hitSlop={12}
            className="w-9 h-9 items-center justify-center mr-1 active:opacity-75"
            accessibilityRole="button"
            accessibilityLabel="Back to chats"
            accessibilityHint="Returns to the conversation list"
          >
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </Pressable>

          <View
            className="w-10 h-10 rounded-full overflow-hidden items-center justify-center mr-3 border border-white/30 bg-white/20"
            accessible={true}
            accessibilityRole="image"
            accessibilityLabel={`Avatar of ${contactName}`}
          >
            {contactAvatar ? (
              <Image
                source={{ uri: contactAvatar }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <Text
                className="text-white text-[16px]"
                style={{ fontFamily: 'SFPRODISPLAYBOLD' }}
              >
                {contactName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          {/* Name & Dynamic Status */}
          <View
            className="flex-1"
            accessible={true}
            accessibilityRole="header"
            accessibilityLabel={`${contactName}, status: ${isLoadingConversation ? 'Loading conversation details' : statusText}`}
          >
            <Text
              className="text-white text-[17px]"
              style={{ fontFamily: 'SFPRODISPLAYBOLD' }}
              numberOfLines={1}
            >
              {contactName}
            </Text>
            <Text
              className={`text-[12px] mt-0.5 ${
                statusText === 'Typing...'
                  ? 'text-white font-semibold'
                  : 'text-white/80'
              }`}
              style={{ fontFamily: 'SFPRODISPLAYREGULAR' }}
              numberOfLines={1}
            >
              {isLoadingConversation ? 'Connecting...' : statusText}
            </Text>
          </View>
        </View>

        {/* Right: Video & Voice Call Icons */}
        <View className="flex-row items-center space-x-3">
          <Pressable
            onPress={() =>
              toast.info(
                'Video Call',
                `Starting video call with ${contactName}`
              )
            }
            hitSlop={8}
            className="w-9 h-9 items-center justify-center active:opacity-75"
            accessibilityRole="button"
            accessibilityLabel={`Start video call with ${contactName}`}
            accessibilityHint="Initiates a video call"
          >
            <Ionicons name="videocam" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={() =>
              toast.info('Voice Call', `Starting call with ${contactName}`)
            }
            hitSlop={8}
            className="w-9 h-9 items-center justify-center active:opacity-75 ml-1"
            accessibilityRole="button"
            accessibilityLabel={`Start voice call with ${contactName}`}
            accessibilityHint="Initiates a voice call"
          >
            <Ionicons name="call" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Messages List Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {isLoadingMessages && sortedMessages.length === 0 ? (
          <View
            className="flex-1 items-center justify-center"
            accessibilityRole="progressbar"
            accessibilityLabel="Loading messages"
          >
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
            onScroll={handleListScroll}
            scrollEventThrottle={100}
            accessibilityRole="list"
            accessibilityLabel={`Messages with ${contactName}`}
            ListHeaderComponent={
              isFetchingNextPage ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  accessibilityLabel="Loading earlier messages"
                />
              ) : null
            }
            ListEmptyComponent={() => (
              <View className="flex-1 items-center justify-center py-12">
                <View
                  className="px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(0,0,0,0.04)',
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
              if (item.type === 'date') {
                return <DateSeparator label={item.label} />;
              }

              const msg = item.message;
              const isMe =
                msg.senderId === currentUserId ||
                msg.id.startsWith('optimistic-');
              const isPending =
                msg.id.startsWith('optimistic-') ||
                msg.clientMessageId?.startsWith('temp-');
              const sendStatus = (
                msg as MessageDto & { sendStatus?: 'pending' | 'failed' }
              ).sendStatus;
              const firstAttachment = (msg.attachments as any)?.[0];
              const imageUri = firstAttachment?.url || null;

              let isRead = false;
              let isDelivered = false;

              if (isMe && !isPending && otherReceipt) {
                if (otherReceipt.read) {
                  if (otherReceipt.read.messageId === msg.id) {
                    isRead = true;
                  } else {
                    const msgTime = new Date(msg.createdAt).getTime();
                    const readTime = new Date(otherReceipt.read.at).getTime();
                    if (
                      !isNaN(msgTime) &&
                      !isNaN(readTime) &&
                      msgTime <= readTime
                    ) {
                      isRead = true;
                    }
                  }
                }

                if (!isRead && otherReceipt.delivered) {
                  if (otherReceipt.delivered.messageId === msg.id) {
                    isDelivered = true;
                  } else {
                    const msgTime = new Date(msg.createdAt).getTime();
                    const deliveredTime = new Date(
                      otherReceipt.delivered.at
                    ).getTime();
                    if (
                      !isNaN(msgTime) &&
                      !isNaN(deliveredTime) &&
                      msgTime <= deliveredTime
                    ) {
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
                  sendStatus={sendStatus}
                  onRetry={
                    sendStatus === 'failed'
                      ? () =>
                          sendMessageMutation.mutate({
                            conversationId: conversationId!,
                            text: msg.text || undefined,
                            attachmentMediaIds: (
                              msg as MessageDto & {
                                attachmentMediaIds?: string[];
                              }
                            ).attachmentMediaIds,
                            clientMessageId: msg.clientMessageId,
                          })
                      : undefined
                  }
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
            backgroundColor: isDark ? colors.surface : '#FFFFFF',
            borderColor: colors.divider,
            paddingBottom: Math.max(insets.bottom, 12),
          }}
        >
          <Pressable
            onPress={() => setShowAttachmentMenu(true)}
            hitSlop={8}
            className="w-10 h-10 items-center justify-center mr-1 active:opacity-75"
            accessibilityRole="button"
            accessibilityLabel="Attach media or document"
            accessibilityHint="Opens attachment options like photo library and camera"
          >
            <Ionicons name="attach" size={24} color={colors.textMuted} />
          </Pressable>

          <View
            className="flex-1 flex-row items-center px-4 py-2.5 rounded-full mr-2 border"
            style={{
              backgroundColor: isDark ? colors.background : '#F9FAFB',
              borderColor: colors.border,
            }}
          >
            <TextInput
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                if (currentUserId && conversationId) {
                  setDraft(currentUserId, conversationId, text);
                }
                handleInputKeystroke();
              }}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              className="flex-1 text-[15px] max-h-24"
              style={{
                color: colors.text,
                fontFamily: 'SFPRODISPLAYREGULAR',
              }}
              multiline
              accessibilityLabel="Message text input"
              accessibilityHint="Type your message here"
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
            accessibilityRole="button"
            accessibilityLabel={
              sendMessageMutation.isPending ? 'Sending message' : 'Send message'
            }
            accessibilityState={{
              disabled: !inputText.trim() || sendMessageMutation.isPending,
              busy: sendMessageMutation.isPending,
            }}
            accessibilityHint={
              !inputText.trim()
                ? 'Disabled. Type a message before sending'
                : 'Sends the composed message'
            }
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

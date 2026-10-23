import { AppText } from '@/shared/components';
import { useAppTheme } from '@/shared/hooks';
import { FlatList, View } from 'react-native';
import type { MessageDto } from '../api/useMessages';
import type { ConversationListItem } from '../hooks/useConversation';
import { formatMessageTime } from '../utils/formatChatDate';
import { AnimatedMessageBubble } from './AnimatedMessageBubble';
import { DateSeparator } from './DateSeparator';
import { TypingIndicator } from './TypingIndicator';

interface MessageListProps {
  listData: ConversationListItem[];
  currentUserId?: string;
  otherReceipt: any;
  isRemoteTyping: boolean;
  isLoading: boolean;
  flatListRef: React.RefObject<FlatList | null>;
}

export function MessageList({
  listData,
  currentUserId,
  otherReceipt,
  isRemoteTyping,
  isLoading,
  flatListRef,
}: MessageListProps) {
  const { colors, isDark } = useAppTheme();

  const renderMessage = (message: MessageDto, isNew: boolean) => {
    const isMe =
      message.senderId === currentUserId ||
      message.id.startsWith('optimistic-');
    const isPending =
      message.id.startsWith('optimistic-') ||
      message.clientMessageId?.startsWith('temp-');
    const firstAttachment = (message.attachments as any)?.[0];
    const imageUri = firstAttachment?.url || null;
    let isRead = false;
    let isDelivered = false;

    if (isMe && !isPending && otherReceipt) {
      const read = otherReceipt.read;
      const delivered = otherReceipt.delivered;
      const messageTime = new Date(message.createdAt).getTime();
      if (read) {
        isRead =
          read.messageId === message.id ||
          messageTime <= new Date(read.at).getTime();
      }
      if (!isRead && delivered) {
        isDelivered =
          delivered.messageId === message.id ||
          messageTime <= new Date(delivered.at).getTime();
      }
    }

    return (
      <AnimatedMessageBubble
        id={message.id}
        text={message.text}
        time={formatMessageTime(message.createdAt)}
        isMe={isMe}
        imageUri={imageUri}
        isPending={isPending}
        animate={isNew}
        isRead={isRead}
        isDelivered={isDelivered}
      />
    );
  };

  if (isLoading && listData.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <AppText
          className="text-[13px] mt-2"
          style={{ color: colors.textMuted }}
        >
          Loading messages...
        </AppText>
      </View>
    );
  }

  return (
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
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(0,0,0,0.04)',
            }}
          >
            <AppText
              className="text-[13px]"
              style={{ color: colors.textMuted }}
            >
              No messages yet. Send a message to start chatting!
            </AppText>
          </View>
        </View>
      )}
      renderItem={({ item }) =>
        item.type === 'date' ? (
          <DateSeparator label={item.label} />
        ) : (
          renderMessage(item.message, item.isNew)
        )
      }
      ListFooterComponent={() => (isRemoteTyping ? <TypingIndicator /> : null)}
    />
  );
}

import { useAppTheme } from '@/shared/hooks';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { ChatAttachmentMenu } from '../components/ChatAttachmentMenu';
import { ConversationHeader } from '../components/ConversationHeader';
import { MessageComposer } from '../components/MessageComposer';
import { MessageList } from '../components/MessageList';
import { useConversation } from '../hooks/useConversation';

export function ChatRoomScreen() {
  const { colors, isDark } = useAppTheme();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    avatarUrl?: string;
    status?: string;
    otherParticipantId?: string;
  }>();

  const conversationId = params.id;
  const contactName = params.name || 'Chat';
  const contactAvatar = params.avatarUrl || '';
  const conversation = useConversation({
    conversationId,
    otherParticipantId: params.otherParticipantId,
    fallbackStatus: params.status || 'Active 5 minutes ago',
  });

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: isDark ? colors.background : '#F4F7F9' }}
    >
      <StatusBar style="light" />
      <ConversationHeader
        contactName={contactName}
        contactAvatar={contactAvatar}
        statusText={conversation.statusText}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <MessageList
          listData={conversation.listData}
          currentUserId={conversation.currentUserId}
          otherReceipt={conversation.otherReceipt}
          isRemoteTyping={conversation.isRemoteTyping}
          isLoading={conversation.isLoadingMessages}
          flatListRef={conversation.flatListRef}
        />
        <MessageComposer
          value={conversation.inputText}
          onChangeText={conversation.handleInputChange}
          onSend={conversation.handleSendMessage}
          onOpenAttachments={() => conversation.setShowAttachmentMenu(true)}
          disabled={conversation.isSending}
        />
      </KeyboardAvoidingView>

      <ChatAttachmentMenu
        visible={conversation.showAttachmentMenu}
        onClose={() => conversation.setShowAttachmentMenu(false)}
        onSelectPhoto={conversation.handleSendPhoto}
      />
    </View>
  );
}

export default ChatRoomScreen;

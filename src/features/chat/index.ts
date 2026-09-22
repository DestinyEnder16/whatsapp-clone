// src/features/chat/index.ts
export { ChatScreen } from "./screens/ChatScreen";
export { ChatRoomScreen } from "./screens/ChatRoomScreen";
export { PinSetupScreen } from "./screens/PinSetupScreen";

// API hooks
export { useConversations } from "./api/useConversations";
export { useCreateDirectConversation } from "./api/useCreateDirectConversation";
export { useSearchUsers } from "./api/useSearchUsers";
export { useMuteConversation, useUnmuteConversation } from "./api/useMuteConversation";
export { useMessages } from "./api/useMessages";
export { useSendMessage } from "./api/useSendMessage";
export { useMarkAsRead } from "./api/useMarkAsRead";

// Socket hooks
export { useChatRoomSocket } from "./hooks/useChatRoomSocket";

// Utilities
export { formatChatDate, formatMessageTime } from "./utils/formatChatDate";
export { formatLastActive } from "./utils/formatLastActive";

// Components
export {
  ConversationItem,
  type ConversationItemData,
  StartConversationModal,
  ConversationInfoModal,
  ContactPickerSheet,
  type ContactPickerItem,
  ChatAttachmentMenu,
  AnimatedMessageBubble,
  TypingIndicator,
} from "./components";

import type * as Notifications from 'expo-notifications';

export interface PendingChatDestination {
  conversationId: string;
  name?: string;
  avatarUrl?: string;
  otherParticipantId?: string;
}

let pendingChatDestination: PendingChatDestination | null = null;

export function getChatDestinationFromNotification(
  response: Notifications.NotificationResponse
): PendingChatDestination | null {
  const data = (response.notification.request.content.data || {}) as Record<
    string,
    unknown
  >;
  const conversationId = data.conversationId || data.conversation_id;

  if (typeof conversationId !== 'string' || !conversationId) return null;

  return {
    conversationId,
    name: typeof data.name === 'string' ? data.name : undefined,
    avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : undefined,
    otherParticipantId:
      typeof data.otherParticipantId === 'string'
        ? data.otherParticipantId
        : undefined,
  };
}

export function setPendingChatDestination(
  destination: PendingChatDestination
): void {
  pendingChatDestination = destination;
}

export function consumePendingChatDestination(): PendingChatDestination | null {
  const destination = pendingChatDestination;
  pendingChatDestination = null;
  return destination;
}

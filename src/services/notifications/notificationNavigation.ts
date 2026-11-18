// src/services/notifications/notificationNavigation.ts
import { useAuthStore } from '@/core/store/useAuthStore';
import { useNavigationStore } from '@/core/store/useNavigationStore';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id.trim());
}

/**
 * Extract conversationId from a push notification payload or deep link URL.
 */
export function extractConversationId(
  data?: Record<string, any> | null
): string | null {
  if (!data) return null;

  // Direct conversationId field
  if (typeof data.conversationId === 'string' && isValidUuid(data.conversationId)) {
    return data.conversationId.trim();
  }

  // Generic id when marked as chat or conversation
  if (
    typeof data.id === 'string' &&
    (data.type === 'chat' || data.type === 'message' || data.type === 'conversation') &&
    isValidUuid(data.id)
  ) {
    return data.id.trim();
  }

  // URL or path in payload e.g. "/chat/uuid" or "whatsappclone:///chat/uuid"
  const urlCandidate = data.url || data.path;
  if (typeof urlCandidate === 'string') {
    const match = urlCandidate.match(/chat\/([0-9a-fA-F-]{36})/);
    if (match && isValidUuid(match[1])) {
      return match[1];
    }
  }

  return null;
}

/**
 * Handle notification tap response in both cold and warm states.
 */
export async function handleNotificationResponse(
  response: Notifications.NotificationResponse | null
): Promise<void> {
  if (!response) return;

  const data = response.notification?.request?.content?.data;
  const conversationId = extractConversationId(data);

  if (!conversationId) {
    return;
  }

  const { isAuthenticated, user, hasHydrated } = useAuthStore.getState();

  // If user is fully authenticated and profile complete, route immediately
  if (hasHydrated && isAuthenticated && user?.profileComplete) {
    try {
      router.push({
        pathname: '/chat/[id]',
        params: { id: conversationId },
      } as any);
    } catch (e) {
      console.warn('[NotificationNavigation] Failed to navigate to chat:', e);
    }
  } else {
    // If signed out or profile incomplete, retain the destination until authentication completes
    useNavigationStore.getState().setPendingConversationId(conversationId);
  }
}

/**
 * Sets up notification response handling for cold start and warm interactions.
 */
export function setupNotificationNavigation(): () => void {
  // 1. Warm / Running state listener: triggered whenever user taps a notification
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      void handleNotificationResponse(response);
    }
  );

  // 2. Cold start check: triggered if app was launched directly from a notification tap
  void Notifications.getLastNotificationResponseAsync().then(
    async (response) => {
      if (response) {
        await handleNotificationResponse(response);
        // Clear to avoid duplicate processing on re-renders
        await Notifications.clearLastNotificationResponseAsync().catch(() => {});
      }
    }
  );

  return () => {
    subscription.remove();
  };
}

// src/services/notifications/index.ts
export { getInstallationId } from './installationId';
export {
  consumePendingChatDestination,
  getChatDestinationFromNotification,
  setPendingChatDestination,
  type PendingChatDestination,
} from './notificationNavigation';
export {
  configureNotificationHandler,
  registerForPushNotificationsAsync,
  sendLocalTestNotification,
  syncPushTokenWithBackend,
  unregisterPushDeviceAsync,
} from './pushNotificationService';

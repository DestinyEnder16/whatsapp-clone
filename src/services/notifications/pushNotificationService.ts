// src/services/notifications/pushNotificationService.ts
import { useNotificationStore } from "@/core/store/useNotificationStore";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Configure foreground notification behavior based on current user preferences.
 * In Expo SDK 57, foreground notifications require an active notification handler.
 */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const { notificationsEnabled, inAppSound, showPreview } =
        useNotificationStore.getState();

      if (!notificationsEnabled) {
        return {
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }

      return {
        shouldPlaySound: inAppSound,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });
}

/**
 * Register device for push notifications, request permissions if needed,
 * and retrieve the Expo Push Token.
 */
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  const store = useNotificationStore.getState();

  // Android requires an explicit notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default Notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#208AEF",
    });
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  const permissionMapped =
    finalStatus === "granted"
      ? "granted"
      : finalStatus === "denied"
        ? "denied"
        : "undetermined";
  store.setPermissionStatus(permissionMapped);

  if (finalStatus !== "granted") {
    return null;
  }

  // Obtain EAS projectId from app configuration
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId ??
    "29a5d457-9aef-4b54-bb2a-7a759aca23c2";

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenResponse.data;

    store.setExpoPushToken(token);

    // Sync token with API backend if available
    await syncPushTokenWithBackend(token);

    return token;
  } catch (error) {
    console.warn("Failed to get Expo push token:", error);
    return null;
  }
}

import { api } from "@/services/api/client";
import { getInstallationId } from "./installationId";

/**
 * Sync the Expo push token with the backend API via PUT /v1/me/push-devices/{installationId}.
 */
export async function syncPushTokenWithBackend(token: string): Promise<boolean> {
  try {
    const installationId = getInstallationId();
    const platform =
      Platform.OS === "ios"
        ? "ios"
        : Platform.OS === "android"
          ? "android"
          : Platform.OS === "web"
            ? "web"
            : "unknown";

    const { data, error } = await api.PUT(
      "/v1/me/push-devices/{installationId}",
      {
        params: {
          path: { installationId },
        },
        body: {
          token,
          platform,
        },
      }
    );

    if (error) {
      console.warn(
        "[PushNotifications] Failed to sync token with backend:",
        error
      );
      return false;
    }

    if (__DEV__) {
      console.log(
        "[PushNotifications] Successfully registered device with backend:",
        data
      );
    }
    return true;
  } catch (err) {
    console.warn("[PushNotifications] Error syncing token with backend:", err);
    return false;
  }
}

/**
 * Unregisters this device installation on the backend when user logs out.
 */
export async function unregisterPushDeviceAsync(): Promise<boolean> {
  try {
    const installationId = getInstallationId();
    const { error } = await api.DELETE(
      "/v1/me/push-devices/{installationId}",
      {
        params: {
          path: { installationId },
        },
      }
    );

    if (error) {
      console.warn(
        "[PushNotifications] Failed to unregister device from backend:",
        error
      );
      return false;
    }

    if (__DEV__) {
      console.log(
        "[PushNotifications] Successfully unregistered device from backend"
      );
    }
    return true;
  } catch (err) {
    console.warn(
      "[PushNotifications] Error unregistering device from backend:",
      err
    );
    return false;
  }
}

/**
 * Trigger an immediate local push notification for testing presentation,
 * banner preview, sound, and badge handling.
 */
export async function sendLocalTestNotification(
  title: string = "ChatMe Notification",
  body: string = "This is a test notification from ChatMe!"
) {
  const { showPreview } = useNotificationStore.getState();

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: showPreview ? body : "You have a new message",
      sound: true,
      data: { type: "test", timestamp: Date.now() },
    },
    trigger: null,
  });
}

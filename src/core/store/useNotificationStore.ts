// src/core/store/useNotificationStore.ts
import { mmkvStorage } from "@/core/storage/mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SoundOption = "Default" | "Note" | "Chord" | "Aurora" | "None";

export interface NotificationState {
  /** Master toggle for all notifications */
  notificationsEnabled: boolean;

  /** Direct Messages notifications */
  messageNotifications: boolean;
  messageSound: SoundOption;
  messageReaction: boolean;

  /** Group Messages notifications */
  groupNotifications: boolean;
  groupSound: SoundOption;
  groupReaction: boolean;

  /** Display preview text inside notification banner */
  showPreview: boolean;

  /** In-App notification behaviors */
  inAppVibrate: boolean;
  inAppSound: boolean;

  /** Push Notification device registration token */
  expoPushToken: string | null;

  /** System notification permission status */
  permissionStatus: "granted" | "undetermined" | "denied";
}

export interface NotificationActions {
  setNotificationsEnabled: (enabled: boolean) => void;
  setMessageNotifications: (enabled: boolean) => void;
  setMessageSound: (sound: SoundOption) => void;
  setMessageReaction: (enabled: boolean) => void;
  setGroupNotifications: (enabled: boolean) => void;
  setGroupSound: (sound: SoundOption) => void;
  setGroupReaction: (enabled: boolean) => void;
  setShowPreview: (show: boolean) => void;
  setInAppVibrate: (enabled: boolean) => void;
  setInAppSound: (enabled: boolean) => void;
  setExpoPushToken: (token: string | null) => void;
  setPermissionStatus: (status: "granted" | "undetermined" | "denied") => void;
  resetToDefaults: () => void;
}

const DEFAULT_STATE: NotificationState = {
  notificationsEnabled: true,
  messageNotifications: true,
  messageSound: "Default",
  messageReaction: true,
  groupNotifications: true,
  groupSound: "Default",
  groupReaction: true,
  showPreview: true,
  inAppVibrate: true,
  inAppSound: true,
  expoPushToken: null,
  permissionStatus: "undetermined",
};

export const useNotificationStore = create<
  NotificationState & NotificationActions
>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setNotificationsEnabled: (notificationsEnabled) =>
        set({ notificationsEnabled }),
      setMessageNotifications: (messageNotifications) =>
        set({ messageNotifications }),
      setMessageSound: (messageSound) => set({ messageSound }),
      setMessageReaction: (messageReaction) => set({ messageReaction }),
      setGroupNotifications: (groupNotifications) =>
        set({ groupNotifications }),
      setGroupSound: (groupSound) => set({ groupSound }),
      setGroupReaction: (groupReaction) => set({ groupReaction }),
      setShowPreview: (showPreview) => set({ showPreview }),
      setInAppVibrate: (inAppVibrate) => set({ inAppVibrate }),
      setInAppSound: (inAppSound) => set({ inAppSound }),
      setExpoPushToken: (expoPushToken) => set({ expoPushToken }),
      setPermissionStatus: (permissionStatus) => set({ permissionStatus }),
      resetToDefaults: () => set({ ...DEFAULT_STATE }),
    }),
    {
      name: "notification-settings-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

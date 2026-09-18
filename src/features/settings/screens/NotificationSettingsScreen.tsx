// src/features/settings/screens/NotificationSettingsScreen.tsx
import {
  SoundOption,
  useNotificationStore,
} from "@/core/store/useNotificationStore";
import {
  getInstallationId,
  registerForPushNotificationsAsync,
  sendLocalTestNotification,
} from "@/services/notifications";
import { ScreenHeader } from "@/shared/components";
import { useAppTheme } from "@/shared/hooks";
import { toast } from "@/shared/utils/toast";
import Ionicons from "@react-native-vector-icons/ionicons";
import * as Clipboard from "expo-clipboard";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

const SOUND_OPTIONS: SoundOption[] = [
  "Default",
  "Note",
  "Chord",
  "Aurora",
  "None",
];

export function NotificationSettingsScreen() {
  const { colors, isDark } = useAppTheme();

  // Store state
  const notificationsEnabled = useNotificationStore(
    (s) => s.notificationsEnabled
  );
  const messageNotifications = useNotificationStore(
    (s) => s.messageNotifications
  );
  const messageSound = useNotificationStore((s) => s.messageSound);
  const messageReaction = useNotificationStore((s) => s.messageReaction);
  const groupNotifications = useNotificationStore((s) => s.groupNotifications);
  const groupSound = useNotificationStore((s) => s.groupSound);
  const groupReaction = useNotificationStore((s) => s.groupReaction);
  const showPreview = useNotificationStore((s) => s.showPreview);
  const inAppVibrate = useNotificationStore((s) => s.inAppVibrate);
  const inAppSound = useNotificationStore((s) => s.inAppSound);
  const expoPushToken = useNotificationStore((s) => s.expoPushToken);
  const permissionStatus = useNotificationStore((s) => s.permissionStatus);

  // Store actions
  const setNotificationsEnabled = useNotificationStore(
    (s) => s.setNotificationsEnabled
  );
  const setMessageNotifications = useNotificationStore(
    (s) => s.setMessageNotifications
  );
  const setMessageSound = useNotificationStore((s) => s.setMessageSound);
  const setMessageReaction = useNotificationStore(
    (s) => s.setMessageReaction
  );
  const setGroupNotifications = useNotificationStore(
    (s) => s.setGroupNotifications
  );
  const setGroupSound = useNotificationStore((s) => s.setGroupSound);
  const setGroupReaction = useNotificationStore((s) => s.setGroupReaction);
  const setShowPreview = useNotificationStore((s) => s.setShowPreview);
  const setInAppVibrate = useNotificationStore((s) => s.setInAppVibrate);
  const setInAppSound = useNotificationStore((s) => s.setInAppSound);
  const resetToDefaults = useNotificationStore((s) => s.resetToDefaults);

  const [isRegistering, setIsRegistering] = useState(false);

  // On initial mount, attempt token retrieval if permissions granted
  useEffect(() => {
    if (permissionStatus === "granted" && !expoPushToken) {
      registerForPushNotificationsAsync();
    }
  }, [permissionStatus, expoPushToken]);

  const handleRequestPermission = async () => {
    setIsRegistering(true);
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        toast.success("Success", "Push notifications registered!");
      } else {
        toast.info(
          "Permission Required",
          "Please enable notifications in system settings."
        );
      }
    } catch {
      toast.error("Error", "Could not register push notifications.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendLocalTestNotification(
        "ChatMe Notification",
        "This is a test notification with sound and preview!"
      );
      toast.info("Sent", "Test notification triggered.");
    } catch {
      toast.error("Failed", "Could not send test notification.");
    }
  };

  const handleCopyToken = async () => {
    if (!expoPushToken) {
      handleRequestPermission();
      return;
    }
    await Clipboard.setStringAsync(expoPushToken);
    toast.success("Copied", "Expo Push Token copied to clipboard.");
  };

  const handleCopyInstallationId = async () => {
    const id = getInstallationId();
    await Clipboard.setStringAsync(id);
    toast.success("Copied", "Installation ID copied to clipboard.");
  };

  const selectSound = (
    currentSound: SoundOption,
    onSelect: (sound: SoundOption) => void,
    title: string
  ) => {
    Alert.alert(
      title,
      `Current: ${currentSound}`,
      SOUND_OPTIONS.map((opt) => ({
        text: opt === currentSound ? `✓ ${opt}` : opt,
        onPress: () => onSelect(opt),
      })),
      { cancelable: true }
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      "Reset Notifications",
      "Reset all notification settings back to default values?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            resetToDefaults();
            toast.info("Reset", "Notification settings reset to default.");
          },
        },
      ]
    );
  };

  const isGranted = permissionStatus === "granted";

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <ScreenHeader title="Notifications" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Top Master Notification Card */}
        <View className="px-6 pt-4 pb-2">
          <View
            className="p-4 rounded-2xl border"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1 mr-3">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{
                    backgroundColor: notificationsEnabled
                      ? colors.primaryLight
                      : colors.border,
                  }}
                >
                  <Ionicons
                    name={
                      notificationsEnabled
                        ? "notifications"
                        : "notifications-off"
                    }
                    size={22}
                    color={
                      notificationsEnabled
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-[17px] font-semibold"
                    style={{ color: colors.text }}
                  >
                    Allow Notifications
                  </Text>
                  <Text
                    className="text-[12px] font-normal mt-0.5"
                    style={{ color: colors.textSecondary }}
                  >
                    {notificationsEnabled ? "Active" : "Muted"}
                  </Text>
                </View>
              </View>

              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{
                  false: isDark ? "#334155" : "#E2E8F0",
                  true: colors.primary,
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={isDark ? "#334155" : "#E2E8F0"}
              />
            </View>

            {/* Permission status & prompt banner */}
            <View
              className="mt-2 pt-3 border-t flex-row items-center justify-between"
              style={{ borderColor: colors.divider }}
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View
                  className="w-2.5 h-2.5 rounded-full mr-2"
                  style={{
                    backgroundColor: isGranted ? "#10B981" : "#F59E0B",
                  }}
                />
                <Text
                  className="text-[12px] font-medium"
                  style={{ color: colors.textSecondary }}
                >
                  {isGranted ? "Permission granted" : "Permission required"}
                </Text>
              </View>

              {!isGranted && (
                <Pressable
                  onPress={handleRequestPermission}
                  disabled={isRegistering}
                  className="px-3 py-1 rounded-full active:opacity-75 flex-row items-center"
                  style={{ backgroundColor: colors.primary }}
                >
                  {isRegistering ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-[12px] font-semibold text-white">
                      Enable
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Section 1: Message Notifications */}
        <View className="mt-4">
          <View className="px-6 pb-2">
            <Text
              className="text-[12px] font-semibold tracking-wider"
              style={{ color: colors.textMuted }}
            >
              MESSAGE NOTIFICATIONS
            </Text>
          </View>

          {/* Show Notifications Switch */}
          <View
            className="px-6 py-3.5 flex-row items-center justify-between"
            style={{ backgroundColor: colors.surface }}
          >
            <Text
              className="text-[16px] font-medium"
              style={{ color: colors.text }}
            >
              Show Notifications
            </Text>
            <Switch
              disabled={!notificationsEnabled}
              value={messageNotifications && notificationsEnabled}
              onValueChange={setMessageNotifications}
              trackColor={{
                false: isDark ? "#334155" : "#E2E8F0",
                true: colors.primary,
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={isDark ? "#334155" : "#E2E8F0"}
            />
          </View>
          <View
            className="h-[1px] ml-6"
            style={{ backgroundColor: colors.divider }}
          />

          {/* Sound Row */}
          <Pressable
            disabled={!notificationsEnabled}
            onPress={() =>
              selectSound(messageSound, setMessageSound, "Message Sound")
            }
            className="px-6 py-3.5 flex-row items-center justify-between active:opacity-70"
            style={{ backgroundColor: colors.surface }}
          >
            <Text
              className="text-[16px] font-medium"
              style={{ color: colors.text }}
            >
              Sound
            </Text>
            <View className="flex-row items-center">
              <Text
                className="text-[14px] mr-2"
                style={{ color: colors.textSecondary }}
              >
                {messageSound}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </View>
          </Pressable>
          <View
            className="h-[1px] ml-6"
            style={{ backgroundColor: colors.divider }}
          />

          {/* Reaction Notifications Switch */}
          <View
            className="px-6 py-3.5 flex-row items-center justify-between"
            style={{ backgroundColor: colors.surface }}
          >
            <Text
              className="text-[16px] font-medium"
              style={{ color: colors.text }}
            >
              Reaction Notifications
            </Text>
            <Switch
              disabled={!notificationsEnabled}
              value={messageReaction && notificationsEnabled}
              onValueChange={setMessageReaction}
              trackColor={{
                false: isDark ? "#334155" : "#E2E8F0",
                true: colors.primary,
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={isDark ? "#334155" : "#E2E8F0"}
            />
          </View>
        </View>

        {/* Section 2: Group Notifications */}
        <View className="mt-6">
          <View className="px-6 pb-2">
            <Text
              className="text-[12px] font-semibold tracking-wider"
              style={{ color: colors.textMuted }}
            >
              GROUP NOTIFICATIONS
            </Text>
          </View>

          {/* Show Notifications Switch */}
          <View
            className="px-6 py-3.5 flex-row items-center justify-between"
            style={{ backgroundColor: colors.surface }}
          >
            <Text
              className="text-[16px] font-medium"
              style={{ color: colors.text }}
            >
              Show Notifications
            </Text>
            <Switch
              disabled={!notificationsEnabled}
              value={groupNotifications && notificationsEnabled}
              onValueChange={setGroupNotifications}
              trackColor={{
                false: isDark ? "#334155" : "#E2E8F0",
                true: colors.primary,
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={isDark ? "#334155" : "#E2E8F0"}
            />
          </View>
          <View
            className="h-[1px] ml-6"
            style={{ backgroundColor: colors.divider }}
          />

          {/* Sound Row */}
          <Pressable
            disabled={!notificationsEnabled}
            onPress={() =>
              selectSound(groupSound, setGroupSound, "Group Sound")
            }
            className="px-6 py-3.5 flex-row items-center justify-between active:opacity-70"
            style={{ backgroundColor: colors.surface }}
          >
            <Text
              className="text-[16px] font-medium"
              style={{ color: colors.text }}
            >
              Sound
            </Text>
            <View className="flex-row items-center">
              <Text
                className="text-[14px] mr-2"
                style={{ color: colors.textSecondary }}
              >
                {groupSound}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </View>
          </Pressable>
          <View
            className="h-[1px] ml-6"
            style={{ backgroundColor: colors.divider }}
          />

          {/* Reaction Notifications Switch */}
          <View
            className="px-6 py-3.5 flex-row items-center justify-between"
            style={{ backgroundColor: colors.surface }}
          >
            <Text
              className="text-[16px] font-medium"
              style={{ color: colors.text }}
            >
              Reaction Notifications
            </Text>
            <Switch
              disabled={!notificationsEnabled}
              value={groupReaction && notificationsEnabled}
              onValueChange={setGroupReaction}
              trackColor={{
                false: isDark ? "#334155" : "#E2E8F0",
                true: colors.primary,
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={isDark ? "#334155" : "#E2E8F0"}
            />
          </View>
        </View>

        {/* Section 3: In-App Notifications & Preview */}
        <View className="mt-6">
          <View className="px-6 pb-2">
            <Text
              className="text-[12px] font-semibold tracking-wider"
              style={{ color: colors.textMuted }}
            >
              IN-APP NOTIFICATIONS
            </Text>
          </View>

          {/* In-App Vibrate Switch */}
          <View
            className="px-6 py-3.5 flex-row items-center justify-between"
            style={{ backgroundColor: colors.surface }}
          >
            <Text
              className="text-[16px] font-medium"
              style={{ color: colors.text }}
            >
              In-App Vibrate
            </Text>
            <Switch
              disabled={!notificationsEnabled}
              value={inAppVibrate && notificationsEnabled}
              onValueChange={setInAppVibrate}
              trackColor={{
                false: isDark ? "#334155" : "#E2E8F0",
                true: colors.primary,
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={isDark ? "#334155" : "#E2E8F0"}
            />
          </View>
          <View
            className="h-[1px] ml-6"
            style={{ backgroundColor: colors.divider }}
          />

          {/* In-App Sounds Switch */}
          <View
            className="px-6 py-3.5 flex-row items-center justify-between"
            style={{ backgroundColor: colors.surface }}
          >
            <Text
              className="text-[16px] font-medium"
              style={{ color: colors.text }}
            >
              In-App Sounds
            </Text>
            <Switch
              disabled={!notificationsEnabled}
              value={inAppSound && notificationsEnabled}
              onValueChange={setInAppSound}
              trackColor={{
                false: isDark ? "#334155" : "#E2E8F0",
                true: colors.primary,
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={isDark ? "#334155" : "#E2E8F0"}
            />
          </View>
          <View
            className="h-[1px] ml-6"
            style={{ backgroundColor: colors.divider }}
          />

          {/* Show Preview Switch */}
          <View
            className="px-6 py-3.5 flex-row items-center justify-between"
            style={{ backgroundColor: colors.surface }}
          >
            <Text
              className="text-[16px] font-medium"
              style={{ color: colors.text }}
            >
              Show Preview
            </Text>
            <Switch
              disabled={!notificationsEnabled}
              value={showPreview && notificationsEnabled}
              onValueChange={setShowPreview}
              trackColor={{
                false: isDark ? "#334155" : "#E2E8F0",
                true: colors.primary,
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={isDark ? "#334155" : "#E2E8F0"}
            />
          </View>

          <View className="px-6 pt-2 pb-1">
            <Text
              className="text-[13px] font-normal leading-4"
              style={{ color: colors.textSecondary }}
            >
              Preview message text inside new message notifications.
            </Text>
          </View>
        </View>

        {/* Section 4: Push Diagnostics & Test */}
        <View className="mt-6">
          <View className="px-6 pb-2">
            <Text
              className="text-[12px] font-semibold tracking-wider"
              style={{ color: colors.textMuted }}
            >
              PUSH NOTIFICATION DIAGNOSTICS
            </Text>
          </View>

          {/* Test Trigger */}
          <Pressable
            onPress={handleTestNotification}
            className="px-6 py-3.5 flex-row items-center justify-between active:opacity-70"
            style={{ backgroundColor: colors.surface }}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="paper-plane-outline"
                size={20}
                color={colors.primary}
                style={{ marginRight: 12 }}
              />
              <Text
                className="text-[16px] font-medium"
                style={{ color: colors.primary }}
              >
                Send Test Notification
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
          <View
            className="h-[1px] ml-6"
            style={{ backgroundColor: colors.divider }}
          />

          {/* Push Token Status & Copy */}
          <Pressable
            onPress={handleCopyToken}
            className="px-6 py-3.5 flex-row items-center justify-between active:opacity-70"
            style={{ backgroundColor: colors.surface }}
          >
            <View className="flex-1 mr-3">
              <Text
                className="text-[16px] font-medium"
                style={{ color: colors.text }}
              >
                Push Device Token
              </Text>
              <Text
                className="text-[12px] font-mono mt-0.5"
                style={{ color: colors.textSecondary }}
                numberOfLines={1}
              >
                {expoPushToken ? expoPushToken : "Not registered yet (Tap to register)"}
              </Text>
            </View>
            <Ionicons
              name="copy-outline"
              size={20}
              color={colors.primary}
            />
          </Pressable>
          <View
            className="h-[1px] ml-6"
            style={{ backgroundColor: colors.divider }}
          />

          {/* Installation ID & Copy */}
          <Pressable
            onPress={handleCopyInstallationId}
            className="px-6 py-3.5 flex-row items-center justify-between active:opacity-70"
            style={{ backgroundColor: colors.surface }}
          >
            <View className="flex-1 mr-3">
              <Text
                className="text-[16px] font-medium"
                style={{ color: colors.text }}
              >
                Installation ID
              </Text>
              <Text
                className="text-[12px] font-mono mt-0.5"
                style={{ color: colors.textSecondary }}
                numberOfLines={1}
              >
                {getInstallationId()}
              </Text>
            </View>
            <Ionicons
              name="copy-outline"
              size={20}
              color={colors.primary}
            />
          </Pressable>
        </View>

        {/* Reset Section */}
        <View className="mt-8 px-6">
          <Pressable
            onPress={handleResetSettings}
            className="py-3.5 rounded-xl items-center justify-center border active:opacity-70"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
          >
            <Text
              className="text-[15px] font-medium"
              style={{ color: "#EF4444" }}
            >
              Reset Notification Settings
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

export default NotificationSettingsScreen;

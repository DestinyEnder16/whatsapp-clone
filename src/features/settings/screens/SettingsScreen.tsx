import { useAuthStore } from "@/core/store/useAuthStore";
import { useMe } from "@/features/auth/api/useMe";
import { useAppTheme } from "@/shared/hooks";
import { toast } from "@/shared/utils/toast";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingItem } from "../components";

export function SettingsScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { colors } = useAppTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Fetch profile from API, falling back to local store for fields like local avatar
  const { data: me } = useMe();
  const activeUser = me || user;

  const displayName =
    typeof activeUser?.displayName === "string" &&
    (activeUser.displayName as string).trim()
      ? (activeUser.displayName as string).trim()
      : typeof user?.displayName === "string" &&
          (user.displayName as string).trim()
        ? (user.displayName as string).trim()
        : "WhatsApp User";

  const phoneNumber = activeUser?.phoneNumber || user?.phoneNumber || "";
  const avatarUrl =
    typeof activeUser?.avatarUrl === "string" && activeUser.avatarUrl
      ? activeUser.avatarUrl
      : typeof user?.avatarUrl === "string"
        ? user.avatarUrl
        : null;

  function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out of ChatMe?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => {
          logout();
          toast.info("Logged Out", "You have been signed out.");
          router.replace("/onboarding");
        },
      },
    ]);
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      edges={["top"]}
    >
      {/* Top Header */}
      <View className="px-6 pt-3 pb-4 flex-row items-center justify-between">
        <Text
          className="text-[26px] font-bold tracking-tight"
          style={{ color: colors.text }}
        >
          Settings
        </Text>
        <Pressable
          onPress={() => router.push("/upload-photo")}
          className="w-10 h-10 items-center justify-center rounded-full active:opacity-75"
          style={{ backgroundColor: colors.surface }}
        >
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        <Pressable
          onPress={() => router.push("/upload-photo")}
          className="px-6 py-3 flex-row items-center active:opacity-80"
        >
          <View
            className="w-[56px] h-[56px] rounded-full overflow-hidden items-center justify-center border"
            style={{
              backgroundColor: colors.primaryLight,
              borderColor: colors.border,
            }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <Text
                className="text-[22px] font-bold"
                style={{ color: colors.primaryDark }}
              >
                {displayName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          <View className="ml-4 flex-1">
            <Text
              className="text-[17px] font-bold"
              style={{ color: colors.text }}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text
              className="text-[13px] font-medium mt-1"
              style={{ color: colors.textSecondary }}
            >
              {phoneNumber}
            </Text>
          </View>

          <Pressable className="p-2 active:opacity-70">
            <Ionicons name="qr-code-outline" size={22} color={colors.primary} />
          </Pressable>
        </Pressable>

        {/* Divider */}
        <View
          className="mx-6 my-3 h-[1px]"
          style={{ backgroundColor: colors.divider }}
        />

        {/* Group 1: Preferences */}
        <SettingItem icon="star-outline" title="Star messages" />
        <SettingItem icon="call-outline" title="Last call" />
        <SettingItem icon="folder-outline" title="My folder" />
        <SettingItem
          icon="contrast-outline"
          title="Appearance"
          onPress={() => router.push("/appearance")}
        />
        <SettingItem
          icon="notifications-outline"
          title="Notification"
          rightElement={
            <Pressable
              onPress={() => setNotificationsEnabled(!notificationsEnabled)}
              className="w-[48px] h-[26px] rounded-full px-0.5 justify-center"
              style={{
                backgroundColor: notificationsEnabled
                  ? colors.primary
                  : colors.surface,
                alignItems: notificationsEnabled ? "flex-end" : "flex-start",
              }}
            >
              <View className="w-[22px] h-[22px] rounded-full bg-white items-center justify-center shadow-sm">
                {notificationsEnabled && (
                  <Ionicons name="checkmark" size={13} color={colors.primary} />
                )}
              </View>
            </Pressable>
          }
        />

        {/* Divider */}
        <View
          className="mx-6 my-3 h-[1px]"
          style={{ backgroundColor: colors.divider }}
        />

        {/* Group 2: Security, Storage, Support & Logout */}
        <SettingItem
          icon="lock-closed-outline"
          title="Privacy"
          onPress={() => router.push("/privacy")}
        />
        <SettingItem
          icon="server-outline"
          title="Data and storage"
          onPress={() => router.push("/data-storage")}
        />
        <SettingItem
          icon="help-circle-outline"
          title="FAQ"
          onPress={() => router.push("/faq")}
        />
        <SettingItem
          icon="log-out-outline"
          title="Logout"
          showChevron={false}
          onPress={handleLogout}
        />

        {/* Footer */}
        <View className="px-6 pt-6 pb-6">
          <Text
            className="text-[12px] font-medium"
            style={{ color: colors.textMuted }}
          >
            2021 ChatMe • Ver 1.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

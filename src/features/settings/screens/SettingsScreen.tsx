import { useAuthStore } from "@/core/store/useAuthStore";
import { useMe } from "@/features/auth/api/useMe";
import colors from "@/shared/theme/colors";
import { toast } from "@/shared/utils/toast";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingItem } from "../components";

export function SettingsScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Fetch profile from API, falling back to local store for fields like local avatar
  const { data: me } = useMe();
  const activeUser = me || user;

  const displayName =
    typeof activeUser?.displayName === "string" && (activeUser.displayName as string).trim()
      ? (activeUser.displayName as string).trim()
      : typeof user?.displayName === "string" && (user.displayName as string).trim()
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
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Top Header */}
      <View className="px-6 pt-3 pb-4 flex-row items-center justify-between">
        <Text className="text-[26px] font-bold text-neutral-900 tracking-tight">
          Settings
        </Text>
        <Pressable
          onPress={() => router.push("/upload-photo")}
          className="w-10 h-10 items-center justify-center rounded-full active:bg-neutral-50"
        >
          <Ionicons
            name="create-outline"
            size={22}
            color={colors.primary[400]}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        <Pressable
          onPress={() => router.push("/upload-photo")}
          className="px-6 py-3 flex-row items-center active:bg-neutral-50/50"
        >
          <View className="w-[56px] h-[56px] rounded-full overflow-hidden bg-primary-100 items-center justify-center border border-primary-200">
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <Text className="text-primary-700 text-[22px] font-bold">
                {displayName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          <View className="ml-4 flex-1">
            <Text
              className="text-[17px] font-bold text-neutral-900"
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text className="text-[13px] text-neutral-300 font-medium mt-1">
              {phoneNumber}
            </Text>
          </View>

          <Pressable className="p-2 active:opacity-70">
            <Ionicons
              name="qr-code-outline"
              size={22}
              color={colors.primary[400]}
            />
          </Pressable>
        </Pressable>

        {/* Divider */}
        <View className="mx-6 my-3 h-[1px] bg-neutral-50" />

        {/* Group 1: Preferences */}
        <SettingItem
          icon="star-outline"
          title="Star messages"
        />
        <SettingItem
          icon="call-outline"
          title="Last call"
        />
        <SettingItem
          icon="folder-outline"
          title="My folder"
        />
        <SettingItem
          icon="contrast-outline"
          title="Appearence"
        />
        <SettingItem
          icon="notifications-outline"
          title="Notification"
          rightElement={
            <Pressable
              onPress={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`w-[48px] h-[26px] rounded-full px-0.5 justify-center ${
                notificationsEnabled
                  ? "bg-primary-400 items-end"
                  : "bg-neutral-100 items-start"
              }`}
            >
              <View className="w-[22px] h-[22px] rounded-full bg-white items-center justify-center shadow-sm">
                {notificationsEnabled && (
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color={colors.primary[400]}
                  />
                )}
              </View>
            </Pressable>
          }
        />

        {/* Divider */}
        <View className="mx-6 my-3 h-[1px] bg-neutral-50" />

        {/* Group 2: Security, Storage, Support & Logout */}
        <SettingItem
          icon="lock-closed-outline"
          title="Privacy"
        />
        <SettingItem
          icon="server-outline"
          title="Data and storage"
        />
        <SettingItem
          icon="help-circle-outline"
          title="FAQ"
        />
        <SettingItem
          icon="log-out-outline"
          title="Logout"
          showChevron={false}
          onPress={handleLogout}
        />

        {/* Footer */}
        <View className="px-6 pt-6 pb-6">
          <Text className="text-[12px] text-neutral-200 font-medium">
            2021 ChatMe • Ver 1.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

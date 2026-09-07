import { useAuthStore } from "@/core/store/useAuthStore";
import colors from "@/shared/theme/colors";
import { toast } from "@/shared/utils/toast";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface SettingItemProps {
  icon: any;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
}

function SettingItem({ icon, title, subtitle, onPress, destructive = false }: SettingItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-5 py-3.5 active:bg-neutral-50"
    >
      <View
        className={`w-9 h-9 rounded-xl items-center justify-center ${
          destructive ? "bg-red-50" : "bg-neutral-50"
        }`}
      >
        <Ionicons
          name={icon}
          size={20}
          color={destructive ? colors.other.danger : colors.neutral[700]}
        />
      </View>
      <View className="ml-3.5 flex-1">
        <Text
          className={`text-[15px] font-semibold ${
            destructive ? "text-red-500" : "text-neutral-900"
          }`}
        >
          {title}
        </Text>
        {subtitle && (
          <Text className="text-[12px] text-neutral-300 mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.neutral[200]} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const displayName = typeof user?.displayName === "string" ? user.displayName : "WhatsApp User";
  const avatarUrl = typeof user?.avatarUrl === "string" ? user.avatarUrl : null;
  const phoneNumber = user?.phoneNumber || "+234 801 234 5678";

  function handleLogout() {
    logout();
    toast.info("Logged Out", "You have been signed out.");
    router.replace("/onboarding");
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-2 pb-3">
        <Text className="text-[26px] font-bold text-neutral-900 tracking-tight">
          Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* User Profile Card */}
        <Pressable
          onPress={() => router.push("/upload-photo")}
          className="mx-5 mb-5 p-4 rounded-2xl bg-neutral-50/80 border border-neutral-100 flex-row items-center active:bg-neutral-100"
        >
          <View className="w-16 h-16 rounded-full overflow-hidden bg-primary-100 items-center justify-center border-2 border-primary-300">
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <Text className="text-primary-700 text-[24px] font-bold">
                {displayName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          <View className="ml-4 flex-1">
            <Text className="text-[17px] font-bold text-neutral-900" numberOfLines={1}>
              {displayName}
            </Text>
            <Text className="text-[13px] text-neutral-300 font-medium mt-0.5">
              {phoneNumber}
            </Text>
            <Text className="text-[12px] text-primary-500 font-medium mt-1">
              Hey there! I am using WhatsApp.
            </Text>
          </View>

          <View className="w-10 h-10 rounded-full bg-white items-center justify-center border border-neutral-100">
            <Ionicons name="qr-code-outline" size={20} color={colors.neutral[700]} />
          </View>
        </Pressable>

        {/* Section 1: Account Settings */}
        <View className="mb-4">
          <Text className="px-5 mb-1.5 text-[12px] font-bold text-neutral-300 uppercase tracking-wider">
            Account & Security
          </Text>
          <View className="border-y border-neutral-50 bg-white">
            <SettingItem
              icon="key-outline"
              title="Account"
              subtitle="Security notifications, change number"
            />
            <View className="ml-17 h-[1px] bg-neutral-50" />
            <SettingItem
              icon="lock-closed-outline"
              title="Privacy"
              subtitle="Block contacts, disappearing messages"
            />
            <View className="ml-17 h-[1px] bg-neutral-50" />
            <SettingItem
              icon="happy-outline"
              title="Avatar"
              subtitle="Create, edit, profile photo"
              onPress={() => router.push("/upload-photo")}
            />
          </View>
        </View>

        {/* Section 2: App Settings */}
        <View className="mb-4">
          <Text className="px-5 mb-1.5 text-[12px] font-bold text-neutral-300 uppercase tracking-wider">
            Preferences
          </Text>
          <View className="border-y border-neutral-50 bg-white">
            <SettingItem
              icon="chatbox-ellipses-outline"
              title="Chats"
              subtitle="Theme, wallpapers, chat history"
            />
            <View className="ml-17 h-[1px] bg-neutral-50" />
            <SettingItem
              icon="notifications-outline"
              title="Notifications"
              subtitle="Message, group & call tones"
            />
            <View className="ml-17 h-[1px] bg-neutral-50" />
            <SettingItem
              icon="pie-chart-outline"
              title="Storage and Data"
              subtitle="Network usage, auto-download"
            />
          </View>
        </View>

        {/* Section 3: Help & Support */}
        <View className="mb-5">
          <Text className="px-5 mb-1.5 text-[12px] font-bold text-neutral-300 uppercase tracking-wider">
            Support
          </Text>
          <View className="border-y border-neutral-50 bg-white">
            <SettingItem
              icon="help-circle-outline"
              title="Help"
              subtitle="Help center, contact us, privacy policy"
            />
            <View className="ml-17 h-[1px] bg-neutral-50" />
            <SettingItem
              icon="heart-outline"
              title="Tell a Friend"
              subtitle="Invite your contacts to WhatsApp"
            />
          </View>
        </View>

        {/* Section 4: Log out */}
        <View className="border-y border-neutral-50 bg-white">
          <SettingItem
            icon="log-out-outline"
            title="Log Out"
            destructive
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// src/features/settings/screens/ManageStorageScreen.tsx
import { ScreenHeader } from "@/shared/components";
import { useAppTheme } from "@/shared/hooks";
import { toast } from "@/shared/utils/toast";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import {
  useClearChatStorage,
  useManageStorageData,
} from "../api/useManageStorageData";
import { ChatStorageItem, StorageProgressBar } from "../components";
import { useDeviceStorage } from "../hooks/useDeviceStorage";

export function ManageStorageScreen() {
  const { colors, isDark } = useAppTheme();
  const { chatList } = useManageStorageData();
  const clearChatMutation = useClearChatStorage();
  const storage = useDeviceStorage();

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "Are you sure you want to clear temporary cached media and files?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await storage.clearAppCache();
            toast.success("Cache Cleared", "Temporary cache has been cleared.");
          },
        },
      ]
    );
  };

  const handleClearChat = (conversationId: string) => {
    clearChatMutation.mutate(conversationId);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Screen Header matching Figma */}
      <ScreenHeader title="Manage Storage" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        {/* Storage Section with Real Device Capacity, Progress Bar, Legend & Breakdown */}
        <StorageProgressBar
          mediaFilesFormatted={storage.mediaFormatted}
          freeFormatted={storage.freeFormatted}
          totalFormatted={storage.totalFormatted}
          mediaPercentage={storage.mediaPercentage}
          categories={storage.categories}
          onClearCache={handleClearCache}
        />

        {/* Chat Section Header */}
        <View className="px-6 pt-5 pb-2">
          <Text
            className="text-[17px] font-bold"
            style={{ color: colors.text }}
          >
            Chat
          </Text>
        </View>

        {/* Chat List */}
        <View className="mt-1">
          {chatList.map((chat) => (
            <ChatStorageItem
              key={chat.conversationId}
              item={chat}
              onClear={handleClearChat}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default ManageStorageScreen;

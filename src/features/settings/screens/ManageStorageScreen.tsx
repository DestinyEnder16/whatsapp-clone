// src/features/settings/screens/ManageStorageScreen.tsx
import { useDataStorageStore } from "@/core/store/useDataStorageStore";
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

export function ManageStorageScreen() {
  const { colors } = useAppTheme();
  const { chatList } = useManageStorageData();
  const clearChatMutation = useClearChatStorage();
  const clearCache = useDataStorageStore((state) => state.clearCache);
  const lastCacheClearedAt = useDataStorageStore(
    (state) => state.lastCacheClearedAt
  );

  const isCacheCleared = !!lastCacheClearedAt;

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "Are you sure you want to clear temporary cached media and files?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            clearCache();
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
      <StatusBar style="light" />

      {/* Screen Header */}
      <ScreenHeader title="Manage Storage" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        {/* Storage Section with Progress Bar & Legend */}
        <StorageProgressBar
          mediaFilesFormatted={isCacheCleared ? "420 MB" : "2,1 GB"}
          freeFormatted={isCacheCleared ? "64,2 GB" : "62,5 GB"}
          mediaPercentage={isCacheCleared ? 8 : 24}
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

// src/features/settings/components/ChatStorageItem.tsx
import { useAppTheme } from "@/shared/hooks";
import { Image } from "expo-image";
import React from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { ChatStorageItemData } from "../api/useManageStorageData";

export interface ChatStorageItemProps {
  item: ChatStorageItemData;
  onClear?: (conversationId: string) => void;
}

export function ChatStorageItem({ item, onClear }: ChatStorageItemProps) {
  const { colors } = useAppTheme();

  const handlePress = () => {
    if (!onClear) return;
    Alert.alert(
      "Manage Chat Storage",
      `Clear stored media and messages for ${item.name}? (${item.sizeFormatted})`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => onClear(item.conversationId),
        },
      ]
    );
  };

  return (
    <Pressable
      onPress={handlePress}
      className="px-6 py-3 flex-row items-center active:opacity-75"
    >
      {/* Contact Avatar */}
      <View
        className="w-[48px] h-[48px] rounded-full overflow-hidden items-center justify-center border"
        style={{
          backgroundColor: colors.primaryLight,
          borderColor: colors.border,
        }}
      >
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Text
            className="text-[18px] font-bold"
            style={{ color: colors.primaryDark }}
          >
            {item.name.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>

      {/* Name and Phone Number */}
      <View className="ml-4 flex-1 justify-center">
        <Text
          className="text-[16px] font-bold"
          style={{ color: colors.text }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {item.phoneNumber ? (
          <Text
            className="text-[13px] mt-0.5"
            style={{ color: colors.textSecondary }}
          >
            {item.phoneNumber}
          </Text>
        ) : null}
      </View>

      {/* Storage Size */}
      <Text
        className="text-[13px] font-medium"
        style={{ color: colors.textSecondary }}
      >
        {item.sizeFormatted}
      </Text>
    </Pressable>
  );
}

export default ChatStorageItem;

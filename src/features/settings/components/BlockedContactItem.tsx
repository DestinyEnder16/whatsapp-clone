// src/features/settings/components/BlockedContactItem.tsx
import { useAppTheme } from "@/shared/hooks";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import React from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { BlockedUserItem } from "../api/useBlockedUsers";

export interface BlockedContactItemProps {
  contact: BlockedUserItem;
  onUnblock: (id: string) => void;
  showDivider?: boolean;
}

export function BlockedContactItem({
  contact,
  onUnblock,
  showDivider = false,
}: BlockedContactItemProps) {
  const { colors } = useAppTheme();

  const handlePress = () => {
    Alert.alert(
      "Unblock Contact",
      `Are you sure you want to unblock ${contact.displayName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          style: "destructive",
          onPress: () => onUnblock(contact.id),
        },
      ]
    );
  };

  return (
    <Pressable
      onPress={handlePress}
      className="px-6 py-3.5 flex-row items-center active:opacity-75"
    >
      {/* Contact Avatar */}
      <View
        className="w-[48px] h-[48px] rounded-full overflow-hidden items-center justify-center border"
        style={{
          backgroundColor: colors.primaryLight,
          borderColor: colors.border,
        }}
      >
        {contact.avatarUrl ? (
          <Image
            source={{ uri: contact.avatarUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Text
            className="text-[18px] font-bold"
            style={{ color: colors.primaryDark }}
          >
            {contact.displayName.charAt(0).toUpperCase()}
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
          {contact.displayName}
        </Text>
        {contact.phoneNumber ? (
          <Text
            className="text-[13px] mt-0.5"
            style={{ color: colors.textSecondary }}
          >
            {contact.phoneNumber}
          </Text>
        ) : null}
      </View>

      {/* Chevron Icon */}
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />

      {/* Optional Divider */}
      {showDivider && (
        <View
          className="absolute bottom-0 left-6 right-6 h-[1px]"
          style={{ backgroundColor: colors.divider }}
        />
      )}
    </Pressable>
  );
}

export default BlockedContactItem;

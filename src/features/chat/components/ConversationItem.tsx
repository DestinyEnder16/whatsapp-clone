// src/features/chat/components/ConversationItem.tsx
import { useAuthStore } from "@/core/store/useAuthStore";
import type { components } from "@/services/api/schema";
import { useAppTheme } from "@/shared/hooks";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { formatChatDate } from "../utils/formatChatDate";

type DirectConversation =
  components["schemas"]["DirectConversationResponseDto"];
type GroupConversation = components["schemas"]["GroupConversationResponseDto"];
export type ConversationItemData = DirectConversation | GroupConversation;

interface ConversationItemProps {
  item: ConversationItemData;
  onPress?: () => void;
  isOnline?: boolean;
}

export function ConversationItem({
  item,
  onPress,
  isOnline = false,
}: ConversationItemProps) {
  const { colors } = useAppTheme();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const isGroup = item.type === "group";
  const rawDisplayName = !isGroup
    ? (item as DirectConversation).otherParticipant?.displayName
    : null;

  const strName =
    typeof rawDisplayName === "string" ? (rawDisplayName as string) : "";

  const name: string = isGroup
    ? (item as GroupConversation).name || "Group"
    : strName.trim() || "Contact";

  const avatarUrl = isGroup
    ? (item as GroupConversation).avatarUrl
    : (item as DirectConversation).otherParticipant?.avatarUrl;

  const isMuted = Boolean(item.settings?.muted);
  const unreadCount = item.unreadCount || 0;
  const hasUnread = unreadCount > 0;

  // Latest message preview text
  const latestMessage = item.latestMessage;
  let previewText = "No messages yet";
  if (latestMessage?.preview) {
    if (latestMessage.senderId === currentUserId) {
      previewText = `You: ${latestMessage.preview}`;
    } else {
      previewText = latestMessage.preview;
    }
  }

  const timeString = formatChatDate(
    latestMessage?.createdAt || item.lastActivityAt || item.updatedAt
  );

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3.5 active:opacity-70"
    >
      {/* Left: Avatar with optional online dot */}
      <View className="relative mr-3.5">
        <View
          className="w-[54px] h-[54px] rounded-full overflow-hidden items-center justify-center border"
          style={{
            backgroundColor: colors.surface,
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
            <View
              className="w-full h-full items-center justify-center"
              style={{ backgroundColor: colors.primaryLight }}
            >
              {isGroup ? (
                <Ionicons name="people" size={24} color={colors.primary} />
              ) : (
                <Text
                  className="text-[20px]"
                  style={{ color: colors.primaryDark, fontFamily: "SFProDisplay-Bold" }}
                >
                  {name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Online Status Dot */}
        {isOnline && (
          <View
            className="w-3.5 h-3.5 rounded-full absolute bottom-0 right-0 border-2"
            style={{
              backgroundColor: "#10B981",
              borderColor: colors.background,
            }}
          />
        )}
      </View>

      {/* Middle: Name & Preview */}
      <View className="flex-1 mr-2">
        <View className="flex-row items-center mb-1">
          {isGroup && (
            <Ionicons
              name="people"
              size={15}
              color="#10B981"
              style={{ marginRight: 5 }}
            />
          )}
          <Text
            className="text-[16px] flex-1"
            style={{ color: colors.text, fontFamily: "SFProDisplay-Bold" }}
            numberOfLines={1}
          >
            {name}
          </Text>

          {isMuted && (
            <Ionicons
              name="volume-mute"
              size={15}
              color={colors.textMuted}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>

        <Text
          className="text-[14px] leading-5"
          style={{
            color: hasUnread ? colors.text : colors.textSecondary,
            fontFamily: hasUnread ? "SFProDisplay-Medium" : "SFProDisplay-Regular",
          }}
          numberOfLines={1}
        >
          {previewText}
        </Text>
      </View>

      {/* Right: Timestamp & Unread Badge */}
      <View className="items-end justify-between min-h-[44px]">
        <Text
          className="text-[12px]"
          style={{
            color: hasUnread ? "#10B981" : colors.textMuted,
            fontFamily: "SFProDisplay-Medium",
          }}
        >
          {timeString}
        </Text>

        {hasUnread ? (
          <View className="min-w-[20px] h-[20px] rounded-full bg-[#10B981] px-1.5 items-center justify-center mt-1">
            <Text
              className="text-white text-[11px]"
              style={{ fontFamily: "SFProDisplay-Bold" }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        ) : (
          <View className="h-[20px]" />
        )}
      </View>
    </Pressable>
  );
}

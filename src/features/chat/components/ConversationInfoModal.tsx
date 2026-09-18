// src/features/chat/components/ConversationInfoModal.tsx
import { useAppTheme } from "@/shared/hooks";
import { toast } from "@/shared/utils/toast";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { ConversationItemData } from "./ConversationItem";

interface ConversationInfoModalProps {
  conversation: ConversationItemData | null;
  visible: boolean;
  onClose: () => void;
}

export function ConversationInfoModal({
  conversation,
  visible,
  onClose,
}: ConversationInfoModalProps) {
  const { colors, isDark } = useAppTheme();

  if (!conversation) return null;

  const isGroup = conversation.type === "group";
  const name = isGroup
    ? (conversation as any).name || "Group"
    : (conversation as any).otherParticipant?.displayName &&
        typeof (conversation as any).otherParticipant.displayName === "string"
      ? (conversation as any).otherParticipant.displayName
      : "Contact";

  const avatarUrl = isGroup
    ? (conversation as any).avatarUrl
    : (conversation as any).otherParticipant?.avatarUrl;

  const participantId = isGroup
    ? undefined
    : (conversation as any).otherParticipant?.id;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 items-center justify-center px-5">
        <View
          className="w-full max-w-[360px] rounded-3xl p-6 border shadow-2xl"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        >
          {/* Top Close Button */}
          <View className="flex-row items-center justify-between mb-4">
            <Text
              className="text-[18px] font-bold"
              style={{ color: colors.text }}
            >
              Conversation Info
            </Text>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full items-center justify-center active:opacity-70"
              style={{ backgroundColor: colors.background }}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Avatar & Name */}
            <View className="items-center justify-center py-3">
              <View
                className="w-20 h-20 rounded-full overflow-hidden items-center justify-center mb-3 border-2"
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
                    className="text-[32px] font-bold"
                    style={{ color: colors.primaryDark }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>

              <Text
                className="text-[20px] font-bold text-center"
                style={{ color: colors.text }}
              >
                {name}
              </Text>
              <Text
                className="text-[13px] font-medium mt-1 uppercase tracking-wider"
                style={{ color: colors.primary }}
              >
                {isGroup ? "Group Conversation" : "Direct Conversation"}
              </Text>
            </View>

            {/* Conversation Fields from Endpoint */}
            <View
              className="mt-4 p-4 rounded-2xl border"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.divider,
              }}
            >
              <Text
                className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                style={{ color: colors.textMuted }}
              >
                Conversation Fields
              </Text>

              <View className="mb-2.5">
                <Text
                  className="text-[11px] font-medium"
                  style={{ color: colors.textSecondary }}
                >
                  Conversation ID
                </Text>
                <Text
                  className="text-[13px] font-mono mt-0.5"
                  style={{ color: colors.text }}
                  numberOfLines={1}
                >
                  {conversation.id}
                </Text>
              </View>

              {participantId && (
                <View className="mb-2.5">
                  <Text
                    className="text-[11px] font-medium"
                    style={{ color: colors.textSecondary }}
                  >
                    Participant ID
                  </Text>
                  <Text
                    className="text-[13px] font-mono mt-0.5"
                    style={{ color: colors.text }}
                    numberOfLines={1}
                  >
                    {participantId}
                  </Text>
                </View>
              )}

              <View className="mb-2.5">
                <Text
                  className="text-[11px] font-medium"
                  style={{ color: colors.textSecondary }}
                >
                  Unread Count
                </Text>
                <Text
                  className="text-[13px] font-semibold mt-0.5"
                  style={{ color: colors.text }}
                >
                  {conversation.unreadCount || 0}
                </Text>
              </View>

              <View className="mb-2.5">
                <Text
                  className="text-[11px] font-medium"
                  style={{ color: colors.textSecondary }}
                >
                  Mute Status
                </Text>
                <Text
                  className="text-[13px] font-medium mt-0.5"
                  style={{ color: colors.text }}
                >
                  {conversation.settings?.muted ? "Muted" : "Active"}
                </Text>
              </View>

              <View>
                <Text
                  className="text-[11px] font-medium"
                  style={{ color: colors.textSecondary }}
                >
                  Last Activity
                </Text>
                <Text
                  className="text-[13px] font-medium mt-0.5"
                  style={{ color: colors.text }}
                >
                  {conversation.lastActivityAt
                    ? new Date(conversation.lastActivityAt).toLocaleString()
                    : "No activity yet"}
                </Text>
              </View>
            </View>

            {/* Note */}
            <View className="mt-4 px-2">
              <Text
                className="text-[12px] text-center"
                style={{ color: colors.textMuted }}
              >
                Chatting functionality is paused as requested. Direct conversation is established with API endpoints.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

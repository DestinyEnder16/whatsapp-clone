// src/features/settings/screens/BlockedContactsScreen.tsx
import { ScreenHeader } from "@/shared/components";
import { useAppTheme } from "@/shared/hooks";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useBlockedUsers, useUnblockUser } from "../api/useBlockedUsers";
import { BlockedContactItem } from "../components";

export function BlockedContactsScreen() {
  const { colors } = useAppTheme();
  const { data: contacts, isLoading } = useBlockedUsers();
  const unblockMutation = useUnblockUser();

  const handleUnblock = (userId: string) => {
    unblockMutation.mutate(userId);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style="light" />

      {/* Screen Header */}
      <ScreenHeader title="Blocked Contact" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="mt-3">
          {isLoading ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : !contacts || contacts.length === 0 ? (
            <View className="py-12 px-6 items-center justify-center">
              <Text
                className="text-[15px] text-center"
                style={{ color: colors.textSecondary }}
              >
                No blocked contacts.
              </Text>
            </View>
          ) : (
            contacts.map((contact) => (
              <BlockedContactItem
                key={contact.id}
                contact={contact}
                onUnblock={handleUnblock}
              />
            ))
          )}

          {/* Subtitle Caption */}
          <View className="px-6 pt-5">
            <Text
              className="text-[13px] leading-5 font-normal"
              style={{ color: colors.textSecondary }}
            >
              Blocked contacts can't send messages and call you.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default BlockedContactsScreen;

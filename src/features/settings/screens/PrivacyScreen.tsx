// src/features/settings/screens/PrivacyScreen.tsx
import {
  PRIVACY_AUDIENCE_LABELS,
  usePrivacyStore,
} from "@/core/store/usePrivacyStore";
import { ScreenHeader } from "@/shared/components";
import { useAppTheme } from "@/shared/hooks";
import { toast } from "@/shared/utils/toast";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useBlockedUsers } from "../api/useBlockedUsers";
import { SettingRowItem } from "../components";

export function PrivacyScreen() {
  const { colors } = useAppTheme();
  const lastSeen = usePrivacyStore((state) => state.lastSeen);
  const profilePhoto = usePrivacyStore((state) => state.profilePhoto);
  const about = usePrivacyStore((state) => state.about);
  const group = usePrivacyStore((state) => state.group);
  const faceIdEnabled = usePrivacyStore((state) => state.faceIdEnabled);
  const setFaceIdEnabled = usePrivacyStore((state) => state.setFaceIdEnabled);

  // Live blocked contacts count from API
  const { data: blockedList } = useBlockedUsers();
  const blockedCount = blockedList ? blockedList.length : 0;

  const handleToggleFaceId = () => {
    const nextState = !faceIdEnabled;
    setFaceIdEnabled(nextState);
    toast.info(
      "Face ID",
      nextState
        ? "Face ID security enabled for ChatMe."
        : "Face ID security disabled."
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style="light" />

      {/* Green Header with Back Arrow and Title */}
      <ScreenHeader title="Privacy" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="mt-2">
          {/* Last Seen Row */}
          <SettingRowItem
            title="Last Seen"
            value={PRIVACY_AUDIENCE_LABELS[lastSeen]}
            onPress={() =>
              router.push({
                pathname: "/settings/privacy-option",
                params: { type: "lastSeen", title: "Last Seen" },
              } as any)
            }
          />

          {/* Profile Photo Row */}
          <SettingRowItem
            title="Profile Photo"
            value={PRIVACY_AUDIENCE_LABELS[profilePhoto]}
            onPress={() =>
              router.push({
                pathname: "/settings/privacy-option",
                params: { type: "profilePhoto", title: "Profile Photo" },
              } as any)
            }
          />

          {/* About Row */}
          <SettingRowItem
            title="About"
            value={PRIVACY_AUDIENCE_LABELS[about]}
            onPress={() =>
              router.push({
                pathname: "/settings/privacy-option",
                params: { type: "about", title: "About" },
              } as any)
            }
          />

          {/* Group Row */}
          <SettingRowItem
            title="Group"
            value={PRIVACY_AUDIENCE_LABELS[group]}
            onPress={() =>
              router.push({
                pathname: "/settings/privacy-option",
                params: { type: "group", title: "Group" },
              } as any)
            }
          />

          {/* Blocked Contact Row */}
          <SettingRowItem
            title="Blocked Contact"
            value={`${blockedCount} Contacts`}
            onPress={() => router.push("/settings/blocked-contacts" as any)}
          />

          {/* Face ID Row */}
          <SettingRowItem
            title="Face ID"
            value={faceIdEnabled ? "Enabled" : undefined}
            onPress={handleToggleFaceId}
          />

          {/* Explanatory Caption */}
          <View className="px-6 pt-3">
            <Text
              className="text-[13px] font-normal"
              style={{ color: colors.textSecondary }}
            >
              With face ID, you can secure your apps
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default PrivacyScreen;

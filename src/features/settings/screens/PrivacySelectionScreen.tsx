// src/features/settings/screens/PrivacySelectionScreen.tsx
import {
  PrivacyAudience,
  usePrivacyStore,
} from "@/core/store/usePrivacyStore";
import { ScreenHeader } from "@/shared/components";
import { useAppTheme } from "@/shared/hooks";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { RadioOptionItem } from "../components";

type PrivacySettingKey = "lastSeen" | "profilePhoto" | "about" | "group";

export function PrivacySelectionScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{
    type?: PrivacySettingKey;
    title?: string;
  }>();

  const type = (params.type || "lastSeen") as PrivacySettingKey;
  const title = params.title || "Last Seen";

  const lastSeen = usePrivacyStore((state) => state.lastSeen);
  const profilePhoto = usePrivacyStore((state) => state.profilePhoto);
  const about = usePrivacyStore((state) => state.about);
  const group = usePrivacyStore((state) => state.group);

  const setLastSeen = usePrivacyStore((state) => state.setLastSeen);
  const setProfilePhoto = usePrivacyStore((state) => state.setProfilePhoto);
  const setAbout = usePrivacyStore((state) => state.setAbout);
  const setGroup = usePrivacyStore((state) => state.setGroup);

  // Determine current value
  const currentValue: PrivacyAudience = (() => {
    switch (type) {
      case "profilePhoto":
        return profilePhoto;
      case "about":
        return about;
      case "group":
        return group;
      case "lastSeen":
      default:
        return lastSeen;
    }
  })();

  const handleSelect = (val: PrivacyAudience) => {
    switch (type) {
      case "profilePhoto":
        setProfilePhoto(val);
        break;
      case "about":
        setAbout(val);
        break;
      case "group":
        setGroup(val);
        break;
      case "lastSeen":
      default:
        setLastSeen(val);
        break;
    }
  };

  const options: { label: string; value: PrivacyAudience }[] = [
    { label: "Everyone", value: "everyone" },
    { label: "My Contact", value: "contacts" },
    { label: "Nobody", value: "nobody" },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style="light" />

      {/* Screen Header with dynamic title */}
      <ScreenHeader title={title} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="mt-2">
          {options.map((opt) => (
            <RadioOptionItem
              key={opt.value}
              label={opt.label}
              selected={currentValue === opt.value}
              onSelect={() => handleSelect(opt.value)}
            />
          ))}

          {/* Subtitle Caption */}
          <View className="px-6 pt-4">
            <Text
              className="text-[13px] leading-5 font-normal"
              style={{ color: colors.textSecondary }}
            >
              Users who have your number saved in their contacts will also see it.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default PrivacySelectionScreen;

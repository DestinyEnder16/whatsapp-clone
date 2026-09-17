// src/features/settings/screens/DataAndStorageScreen.tsx
import {
  AUTO_DOWNLOAD_LABELS,
  useDataStorageStore,
} from "@/core/store/useDataStorageStore";
import { ScreenHeader } from "@/shared/components";
import { useAppTheme } from "@/shared/hooks";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SettingRowItem } from "../components";

export function DataAndStorageScreen() {
  const { colors, isDark } = useAppTheme();
  const photos = useDataStorageStore((state) => state.photos);
  const audio = useDataStorageStore((state) => state.audio);
  const documents = useDataStorageStore((state) => state.documents);
  const videos = useDataStorageStore((state) => state.videos);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Screen Header */}
      <ScreenHeader title="Data and Storage" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="mt-2">
          {/* Manage Storage Row */}
          <SettingRowItem
            title="Manage Storage"
            onPress={() => router.push("/manage-storage")}
          />

          {/* AUTO DOWNLOAD Section Header */}
          <View className="px-6 pt-7 pb-2">
            <Text
              className="text-[12px] font-bold tracking-wider uppercase"
              style={{ color: colors.textMuted }}
            >
              AUTO DOWNLOAD
            </Text>
          </View>

          {/* Photos Row */}
          <SettingRowItem
            title="Photos"
            value={AUTO_DOWNLOAD_LABELS[photos]}
            onPress={() =>
              router.push({
                pathname: "/auto-download",
                params: { type: "photos", title: "Photos" },
              })
            }
          />

          {/* Audio Row */}
          <SettingRowItem
            title="Audio"
            value={AUTO_DOWNLOAD_LABELS[audio]}
            onPress={() =>
              router.push({
                pathname: "/auto-download",
                params: { type: "audio", title: "Audio" },
              })
            }
          />

          {/* Documents Row */}
          <SettingRowItem
            title="Documents"
            value={AUTO_DOWNLOAD_LABELS[documents]}
            onPress={() =>
              router.push({
                pathname: "/auto-download",
                params: { type: "documents", title: "Documents" },
              })
            }
          />

          {/* Videos Row */}
          <SettingRowItem
            title="Videos"
            value={AUTO_DOWNLOAD_LABELS[videos]}
            onPress={() =>
              router.push({
                pathname: "/auto-download",
                params: { type: "videos", title: "Videos" },
              })
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

export default DataAndStorageScreen;

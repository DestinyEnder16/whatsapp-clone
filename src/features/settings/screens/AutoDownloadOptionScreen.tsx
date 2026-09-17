// src/features/settings/screens/AutoDownloadOptionScreen.tsx
import {
  AutoDownloadOption,
  useDataStorageStore,
} from "@/core/store/useDataStorageStore";
import { ScreenHeader } from "@/shared/components";
import { useAppTheme } from "@/shared/hooks";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, View } from "react-native";
import { RadioOptionItem } from "../components";

type MediaDownloadKey = "photos" | "audio" | "documents" | "videos";

export function AutoDownloadOptionScreen() {
  const { colors, isDark } = useAppTheme();
  const params = useLocalSearchParams<{
    type?: MediaDownloadKey;
    title?: string;
  }>();

  const type = (params.type || "photos") as MediaDownloadKey;
  const title = params.title || "Photos";

  const photos = useDataStorageStore((state) => state.photos);
  const audio = useDataStorageStore((state) => state.audio);
  const documents = useDataStorageStore((state) => state.documents);
  const videos = useDataStorageStore((state) => state.videos);

  const setPhotos = useDataStorageStore((state) => state.setPhotos);
  const setAudio = useDataStorageStore((state) => state.setAudio);
  const setDocuments = useDataStorageStore((state) => state.setDocuments);
  const setVideos = useDataStorageStore((state) => state.setVideos);

  const currentValue: AutoDownloadOption = (() => {
    switch (type) {
      case "audio":
        return audio;
      case "documents":
        return documents;
      case "videos":
        return videos;
      case "photos":
      default:
        return photos;
    }
  })();

  const handleSelect = (val: AutoDownloadOption) => {
    switch (type) {
      case "audio":
        setAudio(val);
        break;
      case "documents":
        setDocuments(val);
        break;
      case "videos":
        setVideos(val);
        break;
      case "photos":
      default:
        setPhotos(val);
        break;
    }
  };

  const options: { label: string; value: AutoDownloadOption }[] = [
    { label: "Off", value: "off" },
    { label: "Wi-Fi", value: "wifi" },
    { label: "Wifi and Cellular", value: "cellular" },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Screen Header with dynamic title matching selected media */}
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
        </View>
      </ScrollView>
    </View>
  );
}

export default AutoDownloadOptionScreen;

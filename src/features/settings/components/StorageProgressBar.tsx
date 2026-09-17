// src/features/settings/components/StorageProgressBar.tsx
import { useAppTheme } from "@/shared/hooks";
import React from "react";
import { Pressable, Text, View } from "react-native";

export interface StorageProgressBarProps {
  mediaFilesFormatted?: string;
  freeFormatted?: string;
  mediaPercentage?: number;
  onClearCache?: () => void;
}

export function StorageProgressBar({
  mediaFilesFormatted = "2,1 GB",
  freeFormatted = "62,5 GB",
  mediaPercentage = 24,
  onClearCache,
}: StorageProgressBarProps) {
  const { colors } = useAppTheme();

  return (
    <View className="px-6 pt-5 pb-3">
      {/* Section Title */}
      <Text
        className="text-[17px] font-bold mb-3"
        style={{ color: colors.text }}
      >
        Storage
      </Text>

      {/* Storage Progress Bar */}
      <View
        className="w-full h-[10px] rounded-full flex-row overflow-hidden"
        style={{ backgroundColor: colors.surface }}
      >
        {/* Media and Files Portion */}
        <View
          style={{
            width: `${Math.min(Math.max(mediaPercentage, 5), 100)}%`,
            backgroundColor: colors.primary,
          }}
          className="h-full rounded-l-full"
        />
        {/* Free Space Portion */}
        <View className="flex-1 h-full" style={{ backgroundColor: "#E5E7EB" }} />
      </View>

      {/* Storage Legend */}
      <View className="mt-3.5 space-y-2">
        {/* Media Dot & Text */}
        <View className="flex-row items-center">
          <View
            className="w-2.5 h-2.5 rounded-full mr-2.5"
            style={{ backgroundColor: colors.primary }}
          />
          <Text
            className="text-[13px] font-medium"
            style={{ color: colors.text }}
          >
            Media and Files <Text style={{ color: colors.textMuted }}>•</Text>{" "}
            {mediaFilesFormatted}
          </Text>
        </View>

        {/* Free Dot & Text */}
        <View className="flex-row items-center mt-1.5">
          <View
            className="w-2.5 h-2.5 rounded-full mr-2.5"
            style={{ backgroundColor: "#D1D5DB" }}
          />
          <Text
            className="text-[13px] font-medium"
            style={{ color: colors.text }}
          >
            Free <Text style={{ color: colors.textMuted }}>•</Text>{" "}
            {freeFormatted}
          </Text>
        </View>
      </View>

      {/* Clear Cache Action */}
      {onClearCache && (
        <Pressable
          onPress={onClearCache}
          className="mt-4 self-start py-1 active:opacity-75"
        >
          <Text
            className="text-[14px] font-bold"
            style={{ color: colors.primary }}
          >
            Clear Cache
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default StorageProgressBar;

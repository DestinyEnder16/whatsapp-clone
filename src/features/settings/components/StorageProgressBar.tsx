// src/features/settings/components/StorageProgressBar.tsx
import { StorageCategoryBreakdown } from "../hooks/useDeviceStorage";
import { useAppTheme } from "@/shared/hooks";
import Ionicons from "@react-native-vector-icons/ionicons";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

export interface StorageProgressBarProps {
  mediaFilesFormatted?: string;
  freeFormatted?: string;
  totalFormatted?: string;
  mediaPercentage?: number;
  categories?: StorageCategoryBreakdown[];
  onClearCache?: () => void;
}

export function StorageProgressBar({
  mediaFilesFormatted = "2,1 GB",
  freeFormatted = "62,5 GB",
  totalFormatted,
  mediaPercentage = 24,
  categories,
  onClearCache,
}: StorageProgressBarProps) {
  const { colors } = useAppTheme();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <View className="px-6 pt-5 pb-3">
      {/* Section Title & Optional Total Device Storage Badge */}
      <View className="flex-row items-center justify-between mb-3">
        <Text
          className="text-[17px] font-bold"
          style={{ color: colors.text }}
        >
          Storage
        </Text>
        {totalFormatted ? (
          <Text
            className="text-[12px] font-semibold"
            style={{ color: colors.textMuted }}
          >
            Total: {totalFormatted}
          </Text>
        ) : null}
      </View>

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

      {/* Action Row: Clear Cache & Toggle Breakdown */}
      <View className="mt-4 flex-row items-center justify-between">
        {onClearCache && (
          <Pressable
            onPress={onClearCache}
            className="py-1 active:opacity-75"
          >
            <Text
              className="text-[14px] font-bold"
              style={{ color: colors.primary }}
            >
              Clear Cache
            </Text>
          </Pressable>
        )}

        {categories && categories.length > 0 && (
          <Pressable
            onPress={() => setShowDetails(!showDetails)}
            className="flex-row items-center py-1 active:opacity-75"
          >
            <Text
              className="text-[12px] font-semibold mr-1"
              style={{ color: colors.textSecondary }}
            >
              {showDetails ? "Hide breakdown" : "Category breakdown"}
            </Text>
            <Ionicons
              name={showDetails ? "chevron-up" : "chevron-down"}
              size={14}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
      </View>

      {/* Expandable Category Breakdown Card */}
      {showDetails && categories && categories.length > 0 && (
        <View
          className="mt-3.5 p-3.5 rounded-2xl border"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.cardBorder,
          }}
        >
          <Text
            className="text-[11px] font-bold uppercase tracking-wider mb-2.5"
            style={{ color: colors.textMuted }}
          >
            App Storage Categories
          </Text>

          {categories.map((cat, idx) => (
            <View
              key={cat.label}
              className="flex-row items-center justify-between py-1.5"
              style={{
                borderTopWidth: idx > 0 ? 1 : 0,
                borderTopColor: colors.border,
              }}
            >
              <View className="flex-row items-center">
                <View
                  className="w-2.5 h-2.5 rounded-full mr-2.5"
                  style={{ backgroundColor: cat.color }}
                />
                <Text
                  className="text-[13px] font-medium"
                  style={{ color: colors.text }}
                >
                  {cat.label}
                </Text>
              </View>
              <Text
                className="text-[13px] font-semibold"
                style={{ color: colors.textSecondary }}
              >
                {cat.sizeFormatted}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default StorageProgressBar;

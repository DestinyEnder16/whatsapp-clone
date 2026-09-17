import { useAppTheme } from "@/shared/hooks";
import React from "react";
import { Text, View } from "react-native";

export function AppearanceChatPreview() {
  const { colors, isDark } = useAppTheme();

  return (
    <View
      className="w-full px-5 pt-7 pb-8 relative overflow-hidden"
      style={{
        backgroundColor: isDark ? colors.surface : "#F1F7F3",
      }}
    >
      {/* Subtle decorative background doodles */}
      <View
        pointerEvents="none"
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundColor: isDark ? "transparent" : colors.primary,
        }}
      />

      {/* Received Message Row */}
      <View className="flex-row items-end mb-5">
        <View
          className="max-w-[70%] px-4 py-3 rounded-2xl rounded-tl-sm shadow-xs"
          style={{
            backgroundColor: isDark ? colors.card : "#FFFFFF",
          }}
        >
          <Text
            className="text-[14px] leading-5 font-medium"
            style={{ color: isDark ? colors.text : "#1F2937" }}
          >
            Habitant elit pellentesque curabitur morbi sit fusce elit
          </Text>
        </View>
        <Text
          className="ml-2 text-[12px] font-medium mb-1"
          style={{ color: isDark ? colors.textSecondary : "#94A3B8" }}
        >
          18:25
        </Text>
      </View>

      {/* Sent Message Row */}
      <View className="flex-row items-end justify-end">
        <Text
          className="mr-2 text-[12px] font-medium mb-1"
          style={{ color: isDark ? colors.textSecondary : "#94A3B8" }}
        >
          19:40
        </Text>
        <View
          className="max-w-[70%] px-4 py-3 rounded-2xl rounded-br-sm shadow-xs"
          style={{ backgroundColor: colors.primary }}
        >
          <Text
            className="text-[14px] leading-5 font-semibold"
            style={{ color: colors.primaryText }}
          >
            Gravida lectus semper orci
          </Text>
        </View>
      </View>
    </View>
  );
}

export default AppearanceChatPreview;

// src/features/chat/components/DateSeparator.tsx
import { useAppTheme } from "@/shared/hooks";
import React from "react";
import { Text, View } from "react-native";

interface DateSeparatorProps {
  label: string;
}

/**
 * WhatsApp-style date pill shown between messages from different days
 * e.g. "Today", "Yesterday", "19th September 2026"
 */
export function DateSeparator({ label }: DateSeparatorProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <View className="items-center my-3">
      <View
        className="px-4 py-1.5 rounded-full"
        style={{
          backgroundColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.06)",
        }}
      >
        <Text
          className="text-[12px]"
          style={{
            color: colors.textMuted,
            fontFamily: "SFPRODISPLAYMEDIUM",
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

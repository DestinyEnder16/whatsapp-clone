// src/features/settings/components/RadioOptionItem.tsx
import { useAppTheme } from "@/shared/hooks";
import Ionicons from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, Text, View } from "react-native";

export interface RadioOptionItemProps {
  /** Label for the choice (e.g. 'Everyone', 'Wi-Fi') */
  label: string;
  /** Whether this option is currently selected */
  selected: boolean;
  /** Action triggered when option is selected */
  onSelect: () => void;
  /** Whether to show the bottom border divider (defaults to true) */
  showDivider?: boolean;
}

export function RadioOptionItem({
  label,
  selected,
  onSelect,
  showDivider = true,
}: RadioOptionItemProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className="px-6 active:opacity-75"
    >
      <View className="flex-row items-center justify-between py-4 min-h-[54px]">
        {/* Choice Label */}
        <Text
          className="text-[16px] font-semibold flex-1 mr-4"
          style={{ color: colors.text }}
        >
          {label}
        </Text>

        {/* Circular Check Indicator */}
        {selected ? (
          <View
            className="w-[22px] h-[22px] rounded-full items-center justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Ionicons name="checkmark" size={15} color="#FFFFFF" />
          </View>
        ) : (
          <View
            className="w-[22px] h-[22px] rounded-full border"
            style={{ borderColor: colors.border }}
          />
        )}
      </View>

      {/* Bottom Separator Line */}
      {showDivider && (
        <View
          className="h-[1px] w-full"
          style={{ backgroundColor: colors.divider }}
        />
      )}
    </Pressable>
  );
}

export default RadioOptionItem;

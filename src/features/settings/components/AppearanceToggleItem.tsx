import { useAppTheme } from "@/shared/hooks";
import Ionicons from "@react-native-vector-icons/ionicons";
import React from "react";
import { Switch, Text, View } from "react-native";

interface AppearanceToggleItemProps {
  iconName: string;
  title: string;
  value: boolean;
  onValueChange: (newValue: boolean) => void;
  iconColor?: string;
  iconBgColor?: string;
}

export function AppearanceToggleItem({
  iconName,
  title,
  value,
  onValueChange,
  iconColor,
  iconBgColor,
}: AppearanceToggleItemProps) {
  const { colors, isDark } = useAppTheme();

  const effectiveIconColor = iconColor || colors.primary;
  const effectiveIconBg =
    iconBgColor || (isDark ? colors.surface : "#E8F5ED");

  return (
    <View className="flex-row items-center justify-between px-6 py-3.5">
      <View className="flex-row items-center">
        {/* Rounded Icon Container */}
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3.5"
          style={{ backgroundColor: effectiveIconBg }}
        >
          <Ionicons
            name={iconName as any}
            size={20}
            color={effectiveIconColor}
          />
        </View>

        {/* Title */}
        <Text
          className="text-[16px] font-semibold"
          style={{ color: colors.text }}
        >
          {title}
        </Text>
      </View>

      {/* Switch Toggle */}
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: isDark ? "#334155" : "#E2E8F0",
          true: colors.primary,
        }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={isDark ? "#334155" : "#E2E8F0"}
      />
    </View>
  );
}

export default AppearanceToggleItem;

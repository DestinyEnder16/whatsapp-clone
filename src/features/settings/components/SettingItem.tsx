import colors from "@/shared/theme/colors";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";

export interface SettingItemProps {
  /** Local SVG image asset (via require) */
  icon?: any;
  /** Ionicons icon name */
  ionIcon?: string;
  /** Label for the setting item */
  title: string;
  /** Action on row press */
  onPress?: () => void;
  /** Custom right accessory (e.g. toggle switch), replaces chevron */
  rightElement?: React.ReactNode;
  /** Whether to show the right arrow (defaults to true) */
  showChevron?: boolean;
}

export function SettingItem({
  icon,
  ionIcon,
  title,
  onPress,
  rightElement,
  showChevron = true,
}: SettingItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-6 py-3.5 active:bg-neutral-50/60"
    >
      {/* Circular Green Icon Badge */}
      <View
        className="w-10 h-10 rounded-full items-center justify-center"
        style={{ backgroundColor: colors.primary[100] }}
      >
        {icon ? (
          <Image
            source={icon}
            style={{ width: 18, height: 18 }}
            contentFit="contain"
            tintColor={colors.primary[400]}
          />
        ) : ionIcon ? (
          <Ionicons name={ionIcon as any} size={18} color={colors.primary[400]} />
        ) : null}
      </View>

      {/* Title */}
      <Text className="ml-4 flex-1 text-[15px] font-semibold text-neutral-900">
        {title}
      </Text>

      {/* Right Element or Arrow */}
      {rightElement ? (
        rightElement
      ) : showChevron ? (
        <Image
          source={require("@/assets/icons/solid/cheveron-right.svg")}
          style={{ width: 16, height: 16 }}
          tintColor={colors.neutral[200]}
          contentFit="contain"
        />
      ) : null}
    </Pressable>
  );
}

export default SettingItem;

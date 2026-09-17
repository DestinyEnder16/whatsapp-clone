// src/features/settings/components/SettingRowItem.tsx
import { useAppTheme } from "@/shared/hooks";
import Ionicons from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, Text, View } from "react-native";

export interface SettingRowItemProps {
  /** Left title text (e.g. 'Last Seen', 'Manage Storage') */
  title: string;
  /** Right value text (e.g. 'Everyone', 'Off', '4 Contacts') */
  value?: string;
  /** Row press action handler */
  onPress?: () => void;
  /** Whether to show right chevron arrow (defaults to true) */
  showChevron?: boolean;
  /** Whether to render a bottom border divider (defaults to true) */
  showDivider?: boolean;
  /** Custom right element (e.g. toggle switch) to replace value/chevron */
  rightElement?: React.ReactNode;
  /** Accessibility label */
  accessibilityLabel?: string;
}

export function SettingRowItem({
  title,
  value,
  onPress,
  showChevron = true,
  showDivider = true,
  rightElement,
  accessibilityLabel,
}: SettingRowItemProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress && !rightElement}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      className="px-6 active:opacity-70"
    >
      <View className="flex-row items-center justify-between py-4 min-h-[52px]">
        {/* Left: Title */}
        <Text
          className="text-[16px] font-medium flex-1 mr-2"
          style={{ color: colors.text }}
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Right Element or Value + Chevron */}
        {rightElement ? (
          rightElement
        ) : (
          <View className="flex-row items-center">
            {value ? (
              <Text
                className="text-[14px] mr-2"
                style={{ color: colors.textSecondary }}
              >
                {value}
              </Text>
            ) : null}

            {showChevron && (
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            )}
          </View>
        )}
      </View>

      {/* Bottom Divider */}
      {showDivider && (
        <View
          className="h-[1px] w-full"
          style={{ backgroundColor: colors.divider }}
        />
      )}
    </Pressable>
  );
}

export default SettingRowItem;

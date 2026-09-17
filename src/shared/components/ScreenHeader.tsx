import { useAppTheme } from "@/shared/hooks";
import Ionicons from "@react-native-vector-icons/ionicons";
import { router } from "expo-router";
import React, { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface ScreenHeaderProps {
  /** Title displayed in the center of the header */
  title?: string;
  /** Optional back button press handler (defaults to router.back()) */
  onBack?: () => void;
  /** Whether to show the back chevron button (defaults to true) */
  showBackButton?: boolean;
  /** Custom right element (e.g. icon, text, button) */
  rightElement?: ReactNode;
  /** Optional action handler if rightElement or rightIconName is pressed */
  onRightPress?: () => void;
  /** Optional icon name from Ionicons to display on the right */
  rightIconName?: string;
  /** Size for the right icon (defaults to 24) */
  rightIconSize?: number;
  /** Accessibility label for right action */
  rightActionAccessibilityLabel?: string;
  /** Optional background color override (defaults to theme primary) */
  backgroundColor?: string;
  /** Optional text/icon color override (defaults to theme primaryText) */
  tintColor?: string;
}

export type HeaderProps = ScreenHeaderProps;

export function ScreenHeader({
  title,
  onBack,
  showBackButton = true,
  rightElement,
  onRightPress,
  rightIconName,
  rightIconSize = 24,
  rightActionAccessibilityLabel = "Action",
  backgroundColor,
  tintColor,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  const effectiveBg = backgroundColor || colors.primary;
  const effectiveTint = tintColor || colors.primaryText || "#FFFFFF";

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  const renderRightContent = () => {
    if (rightElement) {
      if (onRightPress) {
        return (
          <Pressable
            onPress={onRightPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="w-10 h-10 items-center justify-center -mr-2 active:opacity-75"
            accessibilityRole="button"
            accessibilityLabel={rightActionAccessibilityLabel}
          >
            {rightElement}
          </Pressable>
        );
      }
      return <View className="-mr-2">{rightElement}</View>;
    }

    if (rightIconName) {
      return (
        <Pressable
          onPress={onRightPress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          className="w-10 h-10 items-center justify-center -mr-2 active:opacity-75"
          accessibilityRole="button"
          accessibilityLabel={rightActionAccessibilityLabel}
        >
          <Ionicons
            name={rightIconName as any}
            size={rightIconSize}
            color={effectiveTint}
          />
        </Pressable>
      );
    }

    // Spacer to balance the header when no right action exists
    return <View className="w-10" />;
  };

  return (
    <View
      style={{
        backgroundColor: effectiveBg,
        paddingTop: insets.top,
      }}
    >
      <View className="px-4 pt-1 pb-3 flex-row items-center justify-between min-h-[58px]">
        {/* Left: Back Button or spacer */}
        {showBackButton ? (
          <Pressable
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="w-10 h-10 items-center justify-center -ml-2 active:opacity-75"
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={26} color={effectiveTint} />
          </Pressable>
        ) : (
          <View className="w-10" />
        )}

        {/* Center: Title */}
        {title ? (
          <Text
            className="text-[19px] font-bold tracking-wide text-center flex-1 mx-2"
            style={{ color: effectiveTint }}
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : (
          <View className="flex-1" />
        )}

        {/* Right: Custom element, icon, or spacer */}
        {renderRightContent()}
      </View>
    </View>
  );
}

export const Header = ScreenHeader;
export default ScreenHeader;

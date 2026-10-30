// src/shared/components/BackButton.tsx
import { useAppTheme } from "@/shared/hooks";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, PressableProps } from "react-native";

interface BackButtonProps extends Omit<PressableProps, "onPress"> {
  onPress?: () => void;
  className?: string;
  fallbackRoute?: string;
}

export default function BackButton({
  onPress,
  className = "",
  fallbackRoute = "/(tabs)",
  style,
  ...props
}: BackButtonProps) {
  const { colors } = useAppTheme();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      accessibilityHint="Returns to the previous screen or conversation list"
      style={[
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        style as any,
      ]}
      className={`w-11 h-11 rounded-2xl border items-center justify-center active:opacity-80 ${className}`}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      {...props}
    >
      <Image
        source={require("@/assets/icons/solid/cheveron-left.svg")}
        style={{ width: 30, height: 30 }}
        contentFit="contain"
        tintColor={colors.text}
      />
    </Pressable>
  );
}

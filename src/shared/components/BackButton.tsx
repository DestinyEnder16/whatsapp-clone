import colors from "@/shared/theme/colors";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, PressableProps } from "react-native";

interface BackButtonProps extends Omit<PressableProps, "onPress"> {
  onPress?: () => void;
  className?: string;
}

export default function BackButton({
  onPress,
  className = "",
  ...props
}: BackButtonProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      className={`w-11 h-11 rounded-2xl border border-neutral-100 bg-white items-center justify-center active:bg-neutral-50 active:opacity-80 ${className}`}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      {...props}
    >
      <Image
        source={require("@/assets/icons/solid/cheveron-left.svg")}
        style={{ width: 30, height: 30 }}
        contentFit="contain"
        tintColor={colors.neutral[900]}
      />
    </Pressable>
  );
}

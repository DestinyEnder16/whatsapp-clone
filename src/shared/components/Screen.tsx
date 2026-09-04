import { ReactNode } from "react";
import { View, ViewStyle } from "react-native";
import { SafeAreaView, SafeAreaViewProps } from "react-native-safe-area-context";

interface ScreenProps extends SafeAreaViewProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  style?: ViewStyle;
}

export default function Screen({
  children,
  className = "flex-1 bg-white",
  contentClassName = "flex-1 px-8 py-[50px]",
  style,
  ...props
}: ScreenProps) {
  return (
    <SafeAreaView className={className} style={style} {...props}>
      <View className={contentClassName}>{children}</View>
    </SafeAreaView>
  );
}

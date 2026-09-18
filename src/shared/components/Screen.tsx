import { useAppTheme } from "@/shared/hooks";
import { StatusBar } from "expo-status-bar";
import React, { ReactNode } from "react";
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
  edges,
  className = "flex-1",
  contentClassName = "flex-1 px-8 py-[50px]",
  style,
  ...props
}: ScreenProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <SafeAreaView
      className={className}
      style={[{ backgroundColor: colors.background }, style]}
      edges={edges}
      {...props}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <View className={contentClassName}>{children}</View>
    </SafeAreaView>
  );
}



import { ReactNode } from "react";
import { View, ViewStyle } from "react-native";
import { SafeAreaView, SafeAreaViewProps } from "react-native-safe-area-context";

export interface TabScreenProps extends SafeAreaViewProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  style?: ViewStyle;
}

export default function TabScreen({
  children,
  edges = ["top"],
  className = "flex-1 bg-white",
  contentClassName = "flex-1 px-4",
  style,
  ...props
}: TabScreenProps) {
  return (
    <SafeAreaView className={className} style={style} edges={edges} {...props}>
      <View className={contentClassName}>{children}</View>
    </SafeAreaView>
  );
}

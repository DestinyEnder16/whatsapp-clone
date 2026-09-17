import { useAppTheme } from "@/shared/hooks";
import React, { ReactNode } from "react";
import { Text, View } from "react-native";

export interface TabHeaderProps {
  title: string;
  rightElement?: ReactNode;
  rightAction?: ReactNode;
  className?: string;
  titleClassName?: string;
}

export default function TabHeader({
  title,
  rightElement,
  rightAction,
  className = "px-4 pt-2 pb-2",
  titleClassName = "text-neutral-900 dark:text-neutral-50 font-bold text-2xl tracking-tight",
}: TabHeaderProps) {
  const { colors } = useAppTheme();
  const right = rightElement ?? rightAction;

  if (right) {
    return (
      <View className={`flex-row items-center justify-between ${className}`}>
        <Text
          className={titleClassName}
          style={{ color: colors.text }}
        >
          {title}
        </Text>
        {right}
      </View>
    );
  }

  return (
    <Text
      className={`${className} ${titleClassName}`}
      style={{ color: colors.text }}
    >
      {title}
    </Text>
  );
}


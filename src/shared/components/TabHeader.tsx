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
  titleClassName = "text-neutral-900 font-bold text-2xl tracking-tight",
}: TabHeaderProps) {
  const right = rightElement ?? rightAction;

  if (right) {
    return (
      <View className={`flex-row items-center justify-between ${className}`}>
        <Text className={titleClassName}>{title}</Text>
        {right}
      </View>
    );
  }

  return <Text className={`${className} ${titleClassName}`}>{title}</Text>;
}

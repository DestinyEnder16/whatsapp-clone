import { useAppTheme } from "@/shared/hooks";
import React from "react";
import { Text, TextStyle } from "react-native";

interface HeadingProps {
  title: string;
  className?: string;
  style?: TextStyle;
}

export default function Heading({ title, className = "", style }: HeadingProps) {
  const { colors } = useAppTheme();

  return (
    <Text
      className={`text-[24px] font-bold ${className}`}
      style={[{ color: colors.text }, style]}
    >
      {title}
    </Text>
  );
}
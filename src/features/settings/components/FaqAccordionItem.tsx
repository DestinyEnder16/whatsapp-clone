// src/features/settings/components/FaqAccordionItem.tsx
import { useAppTheme } from "@/shared/hooks";
import Ionicons from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, Text, View } from "react-native";

export interface FaqAccordionItemProps {
  question: string;
  answer: string;
  isExpanded: boolean;
  onToggle: () => void;
  showDivider?: boolean;
}

export function FaqAccordionItem({
  question,
  answer,
  isExpanded,
  onToggle,
  showDivider = true,
}: FaqAccordionItemProps) {
  const { colors } = useAppTheme();

  return (
    <View className="px-6">
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        className="py-4 flex-row items-center justify-between active:opacity-75"
      >
        {/* Question Title */}
        <Text
          className="text-[16px] font-bold flex-1 mr-3 leading-snug"
          style={{ color: colors.text }}
        >
          {question}
        </Text>

        {/* Circular + / - Icon matching Figma */}
        {isExpanded ? (
          <View
            className="w-[26px] h-[26px] rounded-full items-center justify-center shadow-xs"
            style={{ backgroundColor: colors.primary }}
          >
            <Ionicons name="remove" size={16} color="#FFFFFF" />
          </View>
        ) : (
          <View
            className="w-[26px] h-[26px] rounded-full border items-center justify-center"
            style={{ borderColor: colors.primary, borderWidth: 1.5 }}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
          </View>
        )}
      </Pressable>

      {/* Expanded Answer Content */}
      {isExpanded && (
        <View className="pb-4 pt-0 pr-6">
          <Text
            className="text-[13px] leading-5 font-normal"
            style={{ color: colors.textSecondary }}
          >
            {answer}
          </Text>
        </View>
      )}

      {/* Bottom Separator Line */}
      {showDivider && (
        <View
          className="h-[1px] w-full"
          style={{ backgroundColor: colors.divider }}
        />
      )}
    </View>
  );
}

export default FaqAccordionItem;

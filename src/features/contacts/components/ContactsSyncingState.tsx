import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import colors from "@/shared/theme/colors";

export interface ContactsSyncingStateProps {
  message?: string;
}

export function ContactsSyncingState({
  message = "Finding your friends on Chatme...",
}: ContactsSyncingStateProps = {}) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-6">
      <ActivityIndicator size="large" color={colors.primary[400]} />
      <Text className="text-neutral-500 mt-4 text-sm text-center">
        {message}
      </Text>
    </View>
  );
}

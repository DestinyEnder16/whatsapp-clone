// src/features/chat/components/AnimatedMessageBubble.tsx
import { useAppTheme } from "@/shared/hooks";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import React from "react";
import { Text, View } from "react-native";
import Animated, {
  BounceInLeft,
  BounceInUp,
} from "react-native-reanimated";

interface AnimatedMessageBubbleProps {
  id: string;
  text?: string | null;
  time: string;
  isMe: boolean;
  imageUri?: string | null;
  isPending?: boolean;
  animate?: boolean;
}

export function AnimatedMessageBubble({
  text,
  time,
  isMe,
  imageUri,
  isPending = false,
  animate = false,
}: AnimatedMessageBubbleProps) {
  const { colors, isDark } = useAppTheme();

  // Only animate messages that arrived live (not loaded from history)
  const enteringAnimation = animate
    ? isMe
      ? BounceInUp.duration(400).springify()
      : BounceInLeft.duration(350).springify()
    : undefined;

  const bubbleContent = (
    <View
      className={`max-w-[78%] px-4 py-2.5 rounded-2xl shadow-sm ${
        isMe ? "rounded-tr-sm" : "rounded-tl-sm"
      }`}
      style={{
        backgroundColor: isMe
          ? colors.primary
          : isDark
          ? colors.surface
          : "#FFFFFF",
      }}
    >
      {/* Photo attachment preview if present */}
      {Boolean(imageUri) && (
        <View className="w-56 h-48 rounded-xl overflow-hidden mb-2">
          <Image
            source={{ uri: imageUri! }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        </View>
      )}

      {/* Message text */}
      {Boolean(text) && (
        <Text
          className="text-[15px] leading-5 mb-1"
          style={{
            color: isMe ? "#FFFFFF" : colors.text,
            fontFamily: "SFPRODISPLAYREGULAR",
          }}
        >
          {text}
        </Text>
      )}

      {/* Timestamp & delivery receipt indicator */}
      <View className="flex-row items-center justify-end space-x-1 mt-0.5">
        <Text
          className="text-[11px]"
          style={{
            color: isMe ? "rgba(255,255,255,0.75)" : colors.textMuted,
            fontFamily: "SFPRODISPLAYREGULAR",
          }}
        >
          {time}
        </Text>

        {isMe && (
          <View className="ml-1">
            {isPending ? (
              <Ionicons
                name="time-outline"
                size={12}
                color="rgba(255,255,255,0.65)"
              />
            ) : (
              <Ionicons
                name="checkmark-done"
                size={14}
                color="rgba(255,255,255,0.9)"
              />
            )}
          </View>
        )}
      </View>
    </View>
  );

  // Render with or without animation wrapper
  if (animate) {
    return (
      <Animated.View
        entering={enteringAnimation}
        className={`my-1.5 flex-row ${isMe ? "justify-end" : "justify-start"}`}
      >
        {bubbleContent}
      </Animated.View>
    );
  }

  return (
    <View
      className={`my-1.5 flex-row ${isMe ? "justify-end" : "justify-start"}`}
    >
      {bubbleContent}
    </View>
  );
}

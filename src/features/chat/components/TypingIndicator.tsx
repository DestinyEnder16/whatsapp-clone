// src/features/chat/components/TypingIndicator.tsx
import { useAppTheme } from "@/shared/hooks";
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

function Dot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay }),
        withTiming(-4, { duration: 300 }),
        withTiming(0, { duration: 300 })
      ),
      -1,
      true
    );
  }, [delay, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: "#8E8E93",
          marginHorizontal: 2,
        },
        animatedStyle,
      ]}
    />
  );
}

export function TypingIndicator() {
  const { colors, isDark } = useAppTheme();

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="my-1.5 flex-row justify-start"
    >
      <View
        className="px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex-row items-center"
        style={{
          backgroundColor: isDark ? colors.surface : "#FFFFFF",
        }}
      >
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
    </Animated.View>
  );
}

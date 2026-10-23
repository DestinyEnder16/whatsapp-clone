// src/features/chat/components/AnimatedMessageBubble.tsx
import { AppText } from '@/shared/components';
import { useAppTheme } from '@/shared/hooks';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { View } from 'react-native';
import Animated, { FadeInLeft, ZoomIn } from 'react-native-reanimated';

interface AnimatedMessageBubbleProps {
  id: string;
  text?: string | null;
  time: string;
  isMe: boolean;
  imageUri?: string | null;
  isPending?: boolean;
  animate?: boolean;
  isRead?: boolean;
  isDelivered?: boolean;
}

export function AnimatedMessageBubble({
  text,
  time,
  isMe,
  imageUri,
  isPending = false,
  animate = false,
  isRead = false,
  isDelivered = false,
}: AnimatedMessageBubbleProps) {
  const { colors, isDark } = useAppTheme();

  // Only animate messages that arrived live (not loaded from history)
  // Subtle, quick animations — no big drops from top of screen
  const enteringAnimation = animate
    ? isMe
      ? ZoomIn.duration(200)
      : FadeInLeft.duration(200)
    : undefined;

  const bubbleContent = (
    <View
      className={`max-w-[78%] px-4 py-2.5 rounded-2xl shadow-sm ${
        isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'
      }`}
      style={{
        backgroundColor: isMe
          ? colors.primary
          : isDark
            ? colors.surface
            : '#FFFFFF',
      }}
    >
      {/* Photo attachment preview if present */}
      {Boolean(imageUri) && (
        <View className="w-56 h-48 rounded-xl overflow-hidden mb-2">
          <Image
            source={{ uri: imageUri! }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        </View>
      )}

      {/* Message text */}
      {Boolean(text) && (
        <AppText
          className="text-[15px] leading-5 mb-1"
          style={{
            color: isMe ? '#FFFFFF' : colors.text,
            fontFamily: 'SFPRODISPLAYREGULAR',
          }}
        >
          {text}
        </AppText>
      )}

      {/* Timestamp & delivery receipt indicator */}
      <View className="flex-row items-center justify-end space-x-1 mt-0.5">
        <AppText
          className="text-[11px]"
          style={{
            color: isMe ? 'rgba(255,255,255,0.75)' : colors.textMuted,
            fontFamily: 'SFPRODISPLAYREGULAR',
          }}
        >
          {time}
        </AppText>

        {isMe && (
          <View className="ml-1 flex-row items-center">
            {isPending ? (
              <Ionicons
                name="time-outline"
                size={12}
                color="rgba(255,255,255,0.65)"
              />
            ) : isRead ? (
              <Ionicons name="checkmark-done" size={15} color="#34B7F1" />
            ) : isDelivered ? (
              <Ionicons
                name="checkmark-done"
                size={15}
                color="rgba(255,255,255,0.75)"
              />
            ) : (
              <Ionicons
                name="checkmark"
                size={15}
                color="rgba(255,255,255,0.75)"
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
        className={`my-1.5 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}
      >
        {bubbleContent}
      </Animated.View>
    );
  }

  return (
    <View
      className={`my-1.5 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      {bubbleContent}
    </View>
  );
}

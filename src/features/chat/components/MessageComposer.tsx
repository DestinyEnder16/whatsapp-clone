import { AppTextInput } from '@/shared/components';
import { useAppTheme } from '@/shared/hooks';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MessageComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onOpenAttachments: () => void;
  disabled?: boolean;
}

export function MessageComposer({
  value,
  onChangeText,
  onSend,
  onOpenAttachments,
  disabled = false,
}: MessageComposerProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const canSend = Boolean(value.trim()) && !disabled;

  return (
    <View
      className="flex-row items-center px-4 py-3 border-t"
      style={{
        backgroundColor: isDark ? colors.surface : '#FFFFFF',
        borderColor: colors.divider,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      <Pressable
        onPress={onOpenAttachments}
        hitSlop={8}
        className="w-10 h-10 items-center justify-center mr-1 active:opacity-75"
      >
        <Ionicons name="attach" size={24} color={colors.textMuted} />
      </Pressable>

      <View
        className="flex-1 flex-row items-center px-4 py-2.5 rounded-full mr-2 border"
        style={{
          backgroundColor: isDark ? colors.background : '#F9FAFB',
          borderColor: colors.border,
        }}
      >
        <AppTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          className="flex-1 text-[15px] max-h-24"
          style={{ color: colors.text }}
          multiline
        />
      </View>

      <Pressable
        onPress={onSend}
        disabled={!canSend}
        className="w-11 h-11 rounded-full items-center justify-center active:opacity-85 shadow"
        style={{
          backgroundColor: colors.primary,
          opacity: canSend ? 1 : 0.6,
        }}
      >
        <Ionicons
          name="send"
          size={19}
          color="#FFFFFF"
          style={{ marginLeft: 2 }}
        />
      </Pressable>
    </View>
  );
}

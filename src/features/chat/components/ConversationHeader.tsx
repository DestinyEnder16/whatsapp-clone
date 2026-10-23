import { AppText } from '@/shared/components';
import { useAppTheme } from '@/shared/hooks';
import { toast } from '@/shared/utils/toast';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ConversationHeaderProps {
  contactName: string;
  contactAvatar?: string;
  statusText: string;
}

export function ConversationHeader({
  contactName,
  contactAvatar,
  statusText,
}: ConversationHeaderProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center justify-between px-4 pb-3 shadow-sm"
      style={{ backgroundColor: colors.primary, paddingTop: insets.top + 6 }}
    >
      <View className="flex-row items-center flex-1 mr-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="w-9 h-9 items-center justify-center mr-1 active:opacity-75"
        >
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </Pressable>

        <View className="w-10 h-10 rounded-full overflow-hidden items-center justify-center mr-3 border border-white/30 bg-white/20">
          {contactAvatar ? (
            <Image
              source={{ uri: contactAvatar }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          ) : (
            <AppText variant="bold" className="text-white text-[16px]">
              {contactName.charAt(0).toUpperCase()}
            </AppText>
          )}
        </View>

        <View className="flex-1">
          <AppText
            variant="bold"
            className="text-white text-[17px]"
            numberOfLines={1}
          >
            {contactName}
          </AppText>
          <AppText
            variant={statusText === 'Typing...' ? 'semibold' : 'regular'}
            className={`text-[12px] mt-0.5 ${
              statusText === 'Typing...' ? 'text-white' : 'text-white/80'
            }`}
            numberOfLines={1}
          >
            {statusText}
          </AppText>
        </View>
      </View>

      <View className="flex-row items-center space-x-3">
        <Pressable
          onPress={() =>
            toast.info('Video Call', `Starting video call with ${contactName}`)
          }
          hitSlop={8}
          className="w-9 h-9 items-center justify-center active:opacity-75"
        >
          <Ionicons name="videocam" size={22} color="#FFFFFF" />
        </Pressable>
        <Pressable
          onPress={() =>
            toast.info('Voice Call', `Starting call with ${contactName}`)
          }
          hitSlop={8}
          className="w-9 h-9 items-center justify-center active:opacity-75 ml-1"
        >
          <Ionicons name="call" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

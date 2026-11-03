import { AppText } from '@/shared/components';
import Button from '@/shared/components/Button';
import colors from '@/shared/theme/colors';
import Ionicons from '@react-native-vector-icons/ionicons';
import { View } from 'react-native';

export interface ContactsNotFoundStateProps {
  /** Callback fired when the user taps "Sync Contacts Again" */
  onRetry?: () => void;
  /** Optional custom title text */
  title?: string;
  /** Optional custom description text */
  description?: string;
}

/**
 * Screen displayed when a sync has completed, but zero contacts were found on Chatme.
 */
export function ContactsNotFoundState({
  onRetry,
  title = 'No contacts found yet',
  description = 'None of your contacts are currently on Chatme. Invite your friends or start a chat directly by phone number!',
}: ContactsNotFoundStateProps = {}) {
  return (
    <View className="items-center justify-center py-14 px-8">
      <View className="w-16 h-16 rounded-full bg-neutral-100 items-center justify-center mb-4">
        <Ionicons name="people-outline" size={32} color={colors.neutral[400]} />
      </View>
      <AppText className="text-neutral-900 font-bold text-lg text-center mb-2">
        {title}
      </AppText>
      <AppText className="text-neutral-500 text-sm text-center mb-6 leading-5">
        {description}
      </AppText>
      {onRetry && (
        <View className="w-full">
          <Button title="Sync Contacts Again" onPress={onRetry} />
        </View>
      )}
    </View>
  );
}

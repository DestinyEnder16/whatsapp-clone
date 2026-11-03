import { useAuthStore } from '@/core/store/useAuthStore';
import { useMe } from '@/features/auth/api/useMe';
import { useUpdateProfile } from '@/features/auth/api/useUpdateProfile';
import {
  assignProfileAvatar,
  uploadMedia,
  type SelectedMedia,
} from '@/services/media/uploadMedia';
import { PhotoPickerModal } from '@/shared/components/PhotoPickerModal';
import { useAppTheme } from '@/shared/hooks';
import { toast } from '@/shared/utils/toast';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80';
const textValue = (value: unknown) => (typeof value === 'string' ? value : '');

export function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { data: me } = useMe();
  const activeUser = me || user;
  const updateProfileMutation = useUpdateProfile();
  const [name, setName] = useState(
    textValue(activeUser?.displayName) || 'Roberto William'
  );
  const [avatarUri, setAvatarUri] = useState(
    textValue(activeUser?.avatarUrl) || DEFAULT_AVATAR
  );
  const [selectedAvatar, setSelectedAvatar] = useState<SelectedMedia | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      let updatedUser = await updateProfileMutation.mutateAsync({
        displayName: name.trim() || 'Roberto William',
      });
      if (selectedAvatar) {
        const completedMedia = await uploadMedia(
          selectedAvatar,
          'profile_avatar'
        );
        updatedUser = await assignProfileAvatar(completedMedia.id);
      }
      setUser(updatedUser);
      toast.success('Profile Updated', 'Your profile was saved successfully!');
      router.back();
    } catch (error: any) {
      toast.error(
        'Profile Update Failed',
        error?.message || 'Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  const phoneNumber = textValue(activeUser?.phoneNumber);
  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <View
        style={{
          backgroundColor: colors.primary,
          paddingTop: insets.top,
          height: insets.top + 140,
        }}
        className="w-full relative px-5"
      >
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </Pressable>
        <View
          className="absolute left-0 right-0 items-center"
          style={{ bottom: -68 }}
        >
          <Pressable onPress={() => setModalVisible(true)}>
            <View
              className="w-[136px] h-[136px] rounded-full overflow-hidden"
              style={[
                styles.avatarBorder,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark ? colors.border : '#FFFFFF',
                },
              ]}
            >
              <Image
                source={{ uri: avatarUri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            </View>
          </Pressable>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingTop: 85,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 24,
          flexGrow: 1,
        }}
      >
        <Text className="text-[14px] mb-2" style={{ color: colors.text }}>
          Name
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your full name"
          placeholderTextColor={colors.textMuted}
          className="h-[56px] px-4 rounded-2xl border mb-6"
          style={{
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        />
        <Text className="text-[14px] mb-2" style={{ color: colors.text }}>
          Phone Number
        </Text>
        <TextInput
          value={phoneNumber}
          editable={false}
          className="h-[56px] px-4 rounded-2xl border"
          style={{
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        />
        <View className="flex-1 min-h-[40px]" />
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          className="w-full py-4 rounded-2xl items-center"
          style={{
            backgroundColor: colors.primary,
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          <Text className="text-white text-[17px] font-bold">
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </ScrollView>
      <PhotoPickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelectPhoto={(media) => {
          setSelectedAvatar(media);
          setAvatarUri(media.uri);
          setModalVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  avatarBorder: {
    borderWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
});
export default EditProfileScreen;

import { useAuthStore } from '@/core/store/useAuthStore';
import {
  assignProfileAvatar,
  uploadMedia,
  type SelectedMedia,
} from '@/services/media/uploadMedia';
import { AppText, BackButton, Button } from '@/shared/components';
import { PhotoPickerModal } from '@/shared/components/PhotoPickerModal';
import Screen from '@/shared/components/Screen';
import { useAppTheme } from '@/shared/hooks';
import { toast } from '@/shared/utils/toast';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

type UploadStatus = 'idle' | 'uploading' | 'done' | 'failed';

export function UploadPhotoScreen() {
  const { colors, isDark } = useAppTheme();
  const setUser = useAuthStore((state) => state.setUser);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedMedia | null>(
    null
  );
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleSelectPhoto(media: SelectedMedia) {
    setSelectedImage(media);
    setModalVisible(false);
    setUploadStatus('uploading');
    setUploadError(null);
    try {
      const completedMedia = await uploadMedia(media, 'profile_avatar');
      setUser(await assignProfileAvatar(completedMedia.id));
      setUploadStatus('done');
    } catch (error: any) {
      setUploadStatus('failed');
      setUploadError(error?.message || 'Photo upload failed');
      toast.error('Photo Upload Failed', error?.message || 'Please try again.');
    }
  }

  function handleBack() {
    if (uploadStatus !== 'idle') {
      setUploadStatus('idle');
      return;
    }
    if (router.canGoBack()) router.back();
  }

  return (
    <Screen>
      <View className="mb-4">
        <BackButton onPress={handleBack} />
      </View>
      <View className="mt-4 items-center">
        <AppText
          className="text-[24px] font-bold text-center"
          style={{ color: colors.text }}
        >
          Upload a photo
        </AppText>
      </View>
      {uploadStatus === 'idle' && (
        <Pressable
          onPress={() => setModalVisible(true)}
          className="flex-1 items-center justify-center"
        >
          <Image
            source={
              isDark
                ? require('@/assets/images/upload-photo-dark.svg')
                : require('@/assets/images/upload-photo-light.svg')
            }
            style={{ width: 170, height: 170 }}
            contentFit="contain"
          />
        </Pressable>
      )}
      {uploadStatus === 'uploading' && (
        <View className="flex-1 items-center justify-center">
          <Image
            source={require('@/assets/images/uploading-photo-light.svg')}
            style={{ width: 170, height: 170 }}
            contentFit="contain"
          />
          <AppText
            className="mt-8 text-[16px]"
            style={{ color: colors.textSecondary }}
          >
            Uploading your photo...
          </AppText>
        </View>
      )}
      {(uploadStatus === 'done' || uploadStatus === 'failed') && (
        <View className="flex-1 items-center justify-center">
          <Pressable onPress={() => setModalVisible(true)} className="relative">
            <View
              className="w-[150px] h-[150px] rounded-full overflow-hidden"
              style={{ backgroundColor: colors.surface }}
            >
              {selectedImage && (
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              )}
            </View>
            {uploadStatus === 'done' && (
              <View
                className="absolute top-1 right-2 w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.primary }}
              >
                <Image
                  source={require('@/assets/icons/solid/check.svg')}
                  style={{ width: 18, height: 18 }}
                  tintColor="#FFFFFF"
                />
              </View>
            )}
          </Pressable>
          <AppText
            className="mt-8 text-[16px] text-center"
            style={{ color: colors.textSecondary }}
          >
            {uploadStatus === 'done'
              ? 'Done! Your photo was uploaded.'
              : uploadError || 'Upload failed. Try again.'}
          </AppText>
        </View>
      )}
      <View className="mt-auto pb-4">
        {uploadStatus === 'idle' && (
          <>
            <Button
              title="Upload Photo"
              onPress={() => setModalVisible(true)}
            />
            <Pressable
              onPress={() => router.replace('/(tabs)')}
              className="items-center py-2"
            >
              <AppText style={{ color: colors.textSecondary }}>
                Skip for now
              </AppText>
            </Pressable>
          </>
        )}
        {uploadStatus === 'uploading' && <View className="h-[56px]" />}
        {uploadStatus === 'failed' && (
          <Button
            title="Retry"
            onPress={() => selectedImage && handleSelectPhoto(selectedImage)}
          />
        )}
        {uploadStatus === 'done' && (
          <Button title="Next" onPress={() => router.replace('/(tabs)')} />
        )}
      </View>
      <PhotoPickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelectPhoto={handleSelectPhoto}
      />
    </Screen>
  );
}

export default UploadPhotoScreen;

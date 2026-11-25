import {
  assertSessionOwnerCurrent,
  captureSessionOwner,
  isSessionEndedError,
} from '@/core/session/sessionOwner';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useNavigationStore } from '@/core/store/useNavigationStore';
import { uploadProfileAvatar } from '@/services/media/profileAvatar';
import {
  createClientUploadId,
  discardUploadOperation,
  type SelectedMedia,
} from '@/services/media/uploadMedia';
import { findPendingUpload } from '@/services/media/uploadOperationStore';
import { AppText, BackButton, Button } from '@/shared/components';
import { PhotoPickerModal } from '@/shared/components/PhotoPickerModal';
import Screen from '@/shared/components/Screen';
import { useAppTheme } from '@/shared/hooks';
import { toast } from '@/shared/utils/toast';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

type UploadStatus = 'idle' | 'uploading' | 'done' | 'failed';

export function UploadPhotoScreen() {
  const { colors, isDark } = useAppTheme();
  const setUser = useAuthStore((state) => state.setUser);

  // An upload this account started earlier that never finished (failed, or the
  // app was closed): resume it instead of making the user start over.
  const [unfinished] = useState(() =>
    findPendingUpload(useAuthStore.getState().user?.id, 'profile_avatar')
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedMedia | null>(
    unfinished?.media ?? null
  );
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(
    unfinished ? 'failed' : 'idle'
  );
  const [uploadError, setUploadError] = useState<string | null>(
    unfinished ? 'Your last upload did not finish. Retry to continue.' : null
  );

  // The id of the upload being attempted. Reused by Retry so a stage that
  // already succeeded (transfer, completion) is not repeated.
  const uploadIdRef = useRef<string | undefined>(unfinished?.clientUploadId);
  const abortRef = useRef<AbortController | null>(null);

  // Stop an in-flight upload when leaving the screen.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function runUpload(media: SelectedMedia) {
    // Who is uploading: captured before any await and checked after each one.
    const owner = captureSessionOwner();
    const controller = new AbortController();
    abortRef.current = controller;
    const clientUploadId = uploadIdRef.current ?? createClientUploadId();
    uploadIdRef.current = clientUploadId;

    setUploadStatus('uploading');
    setUploadError(null);
    try {
      const updatedUser = await uploadProfileAvatar(media, {
        owner,
        signal: controller.signal,
        clientUploadId,
      });
      // Last check before the auth-store write.
      assertSessionOwnerCurrent(owner);
      setUser(updatedUser);
      uploadIdRef.current = undefined;
      setUploadStatus('done');
    } catch (error: any) {
      // Stopped because the screen closed or the session ended: say nothing.
      if (isSessionEndedError(error)) return;
      setUploadStatus('failed');
      setUploadError(error?.message || 'Photo upload failed');
      toast.error('Photo Upload Failed', error?.message || 'Please try again.');
    }
  }

  // A newly chosen photo is a new upload (new idempotency key).
  function handleSelectPhoto(media: SelectedMedia) {
    const accountId = useAuthStore.getState().user?.id;
    if (accountId && uploadIdRef.current) {
      discardUploadOperation(accountId, uploadIdRef.current);
    }
    uploadIdRef.current = undefined;
    setSelectedImage(media);
    setModalVisible(false);
    void runUpload(media);
  }

  // Retry continues the SAME upload from the stage that failed.
  function handleRetry() {
    if (selectedImage) void runUpload(selectedImage);
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
              onPress={() => {
                const pending =
                  useNavigationStore.getState().consumePendingDestination();
                if (pending?.pathname) {
                  router.replace(pending.pathname as any);
                } else {
                  router.replace('/(tabs)');
                }
              }}
              className="items-center py-2"
              accessibilityRole="button"
              accessibilityLabel="Skip for now"
              accessibilityHint="Proceed to your conversations without uploading a photo"
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
            onPress={handleRetry}
            accessibilityLabel="Retry photo upload"
            accessibilityHint="Retries uploading your selected photo"
          />
        )}
        {uploadStatus === 'done' && (
          <Button
            title="Next"
            onPress={() => {
              const pending =
                useNavigationStore.getState().consumePendingDestination();
              if (pending?.pathname) {
                router.replace(pending.pathname as any);
              } else {
                router.replace('/(tabs)');
              }
            }}
            accessibilityLabel="Next"
            accessibilityHint="Continues to your conversations"
          />
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

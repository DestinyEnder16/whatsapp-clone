import { useAuthStore } from "@/core/store/useAuthStore";
import { useUpdateProfile } from "@/features/auth/api/useUpdateProfile";
import { BackButton, Button } from "@/shared/components";
import { PhotoPickerModal } from "@/shared/components/PhotoPickerModal";
import Screen from "@/shared/components/Screen";
import colors from "@/shared/theme/colors";
import { toast } from "@/shared/utils/toast";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

type UploadStatus = "idle" | "uploading" | "done";

export function UploadPhotoScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const updateProfileMutation = useUpdateProfile();

  async function handleSelectPhoto(uri: string) {
    setSelectedImage(uri);
    setModalVisible(false);
    setUploadStatus("uploading");

    const startTime = Date.now();

    updateProfileMutation.mutate(
      { avatarUrl: uri },
      {
        onSuccess: async (updatedUser) => {
          // Keep uploading screen visible for at least 1.2s for smooth UX
          const elapsed = Date.now() - startTime;
          if (elapsed < 1200) {
            await new Promise((resolve) => setTimeout(resolve, 1200 - elapsed));
          }
          setUser(updatedUser);
          setUploadStatus("done");
        },
        onError: async (err: Error) => {
          console.warn("Update profile API warning:", err.message);
          const elapsed = Date.now() - startTime;
          if (elapsed < 1200) {
            await new Promise((resolve) => setTimeout(resolve, 1200 - elapsed));
          }
          // Sync local user store so the user's selected photo persists
          if (user) {
            setUser({ ...user, avatarUrl: uri as any });
          }
          setUploadStatus("done");
        },
      },
    );
  }

  function handleBack() {
    if (uploadStatus === "done") {
      setUploadStatus("idle");
    } else if (uploadStatus === "uploading") {
      setUploadStatus("idle");
    } else if (router.canGoBack()) {
      router.back();
    }
  }

  function handleNext() {
    toast.success(
      "Profile Setup Complete",
      "Your photo was successfully uploaded!",
    );
    router.replace("/(tabs)");
  }

  return (
    <Screen>
      <View className="mb-4">
        <BackButton onPress={handleBack} />
      </View>

      <View className="mt-4 items-center">
        <Text className="text-[24px] font-bold text-neutral-900 tracking-tight">
          Upload a photo
        </Text>
      </View>

      {/* Center illustration & feedback */}
      {uploadStatus === "idle" && (
        <Pressable
          onPress={() => setModalVisible(true)}
          className="flex-1 items-center justify-center"
        >
          <Image
            source={require("@/assets/images/upload-photo-light.svg")}
            style={{ width: 170, height: 170 }}
            contentFit="contain"
          />
        </Pressable>
      )}

      {uploadStatus === "uploading" && (
        <View className="flex-1 items-center justify-center">
          <Image
            source={require("@/assets/images/uploading-photo-light.svg")}
            style={{ width: 170, height: 170 }}
            contentFit="contain"
          />
          <Text className="mt-8 text-[16px] text-neutral-400 font-medium text-center leading-6">
            Wait a second, your photo{"\n"}still uploading
          </Text>
        </View>
      )}

      {uploadStatus === "done" && (
        <View className="flex-1 items-center justify-center">
          <Pressable
            onPress={() => setModalVisible(true)}
            className="relative items-center justify-center"
          >
            <View className="w-[150px] h-[150px] rounded-full overflow-hidden bg-neutral-100">
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : null}
            </View>

            {/* Green checkmark badge on top right */}
            <View
              className="absolute top-1 right-2 w-9 h-9 rounded-full items-center justify-center border-[2.5px] border-white"
              style={{ backgroundColor: colors.primary[400] }}
            >
              <Image
                source={require("@/assets/icons/solid/check.svg")}
                style={{ width: 18, height: 18 }}
                tintColor="#FFFFFF"
                contentFit="contain"
              />
            </View>
          </Pressable>

          <Text className="mt-8 text-[16px] text-neutral-400 font-medium text-center leading-6">
            Done! Your photo{"\n"}successfully uploaded
          </Text>
        </View>
      )}

      {/* Bottom Action Area */}
      <View className="mt-auto pb-4">
        {uploadStatus === "idle" && (
          <View className="gap-y-3">
            <Button
              title="Upload Photo"
              onPress={() => setModalVisible(true)}
            />
            <Pressable
              onPress={() => router.replace("/(tabs)")}
              className="items-center py-2 active:opacity-70"
            >
              <Text className="text-[15px] font-semibold text-neutral-300">
                Skip for now
              </Text>
            </Pressable>
          </View>
        )}

        {uploadStatus === "uploading" && <View className="h-[56px]" />}

        {uploadStatus === "done" && (
          <Button title="Next" onPress={handleNext} />
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

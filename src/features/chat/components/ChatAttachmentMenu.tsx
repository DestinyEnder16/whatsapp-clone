// src/features/chat/components/ChatAttachmentMenu.tsx
import { useAppTheme } from "@/shared/hooks";
import { toast } from "@/shared/utils/toast";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

// Preview mock photos matching Mockup 4
const PREVIEW_PHOTOS = [
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
];

interface ChatAttachmentMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelectPhoto?: (uri: string) => void;
  onSelectOption?: (option: string) => void;
}

export function ChatAttachmentMenu({
  visible,
  onClose,
  onSelectPhoto,
  onSelectOption,
}: ChatAttachmentMenuProps) {
  const { colors, isDark } = useAppTheme();

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        onClose();
        if (onSelectPhoto) {
          onSelectPhoto(result.assets[0].uri);
        }
      }
    } catch (e: any) {
      toast.error("Error", "Could not open image library");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        toast.error("Permission Denied", "Camera permission is required to take photos");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        onClose();
        if (onSelectPhoto) {
          onSelectPhoto(result.assets[0].uri);
        }
      }
    } catch (e: any) {
      toast.error("Error", "Could not open camera");
    }
  };

  const handleOptionPress = (title: string) => {
    if (title === "Photo or Gallery") {
      handlePickFromGallery();
      return;
    }

    onClose();
    if (onSelectOption) {
      onSelectOption(title);
    }
    toast.info(title, `${title} sharing option selected`);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 justify-end px-4 pb-20"
        style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
      >
        {/* Attachment Card matching Mockup 4 */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full rounded-[24px] p-4 shadow-xl"
          style={{
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderWidth: 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 10,
          }}
        >
          {/* Top Row: Camera Card + Recent Photos Scroll */}
          <View className="mb-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 8 }}
            >
              {/* Camera Action Card */}
              <Pressable
                onPress={handleTakePhoto}
                className="w-16 h-16 rounded-2xl items-center justify-center mr-2.5 active:opacity-75"
                style={{
                  backgroundColor: isDark ? colors.surface : "#E5E7EB",
                }}
              >
                <Ionicons
                  name="camera"
                  size={26}
                  color={isDark ? colors.text : "#4B5563"}
                />
              </Pressable>

              {/* Recent Photo Preview Thumbnails */}
              {PREVIEW_PHOTOS.map((uri, index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    onClose();
                    if (onSelectPhoto) onSelectPhoto(uri);
                  }}
                  className="w-16 h-16 rounded-2xl overflow-hidden mr-2.5 active:opacity-75 border"
                  style={{ borderColor: colors.border }}
                >
                  <Image
                    source={{ uri }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Options List matching Mockup 4 */}
          <View className="space-y-1">
            {/* Photo or Gallery */}
            <Pressable
              onPress={() => handleOptionPress("Photo or Gallery")}
              className="flex-row items-center py-2.5 px-2 rounded-xl active:opacity-70"
            >
              <View className="w-8 h-8 items-center justify-center mr-3">
                <Ionicons name="images" size={22} color={colors.primary} />
              </View>
              <Text
                className="text-[15px]"
                style={{ color: colors.text, fontFamily: "SFPRODISPLAYMEDIUM" }}
              >
                Photo or Gallery
              </Text>
            </Pressable>

            {/* Document */}
            <Pressable
              onPress={() => handleOptionPress("Document")}
              className="flex-row items-center py-2.5 px-2 rounded-xl active:opacity-70"
            >
              <View className="w-8 h-8 items-center justify-center mr-3">
                <Ionicons name="document-text" size={22} color={colors.primary} />
              </View>
              <Text
                className="text-[15px]"
                style={{ color: colors.text, fontFamily: "SFPRODISPLAYMEDIUM" }}
              >
                Document
              </Text>
            </Pressable>

            {/* Location */}
            <Pressable
              onPress={() => handleOptionPress("Location")}
              className="flex-row items-center py-2.5 px-2 rounded-xl active:opacity-70"
            >
              <View className="w-8 h-8 items-center justify-center mr-3">
                <Ionicons name="location" size={22} color={colors.primary} />
              </View>
              <Text
                className="text-[15px]"
                style={{ color: colors.text, fontFamily: "SFPRODISPLAYMEDIUM" }}
              >
                Location
              </Text>
            </Pressable>

            {/* Contact */}
            <Pressable
              onPress={() => handleOptionPress("Contact")}
              className="flex-row items-center py-2.5 px-2 rounded-xl active:opacity-70"
            >
              <View className="w-8 h-8 items-center justify-center mr-3">
                <Ionicons name="person" size={22} color={colors.primary} />
              </View>
              <Text
                className="text-[15px]"
                style={{ color: colors.text, fontFamily: "SFPRODISPLAYMEDIUM" }}
              >
                Contact
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default ChatAttachmentMenu;

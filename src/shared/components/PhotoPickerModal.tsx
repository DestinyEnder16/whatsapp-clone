// src/shared/components/PhotoPickerModal.tsx
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  Asset,
  AssetField,
  MediaType,
  Query,
  requestPermissionsAsync,
} from "expo-media-library";
// Replace the old @expo/vector-icons import:
import { Ionicons } from "@react-native-vector-icons/ionicons";


interface PhotoPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPhoto: (uri: string) => void;
}

export function PhotoPickerModal({
  visible,
  onClose,
  onSelectPhoto,
}: PhotoPickerModalProps) {
  const [recentPhotos, setRecentPhotos] = useState<Asset[]>([]);

  useEffect(() => {
    if (visible) {
      loadRecentPhotos();
    }
  }, [visible]);

  async function loadRecentPhotos() {
    const { status } = await requestPermissionsAsync();
    if (status !== "granted") return;

    try {
      // SDK 57 Query
      const assets = await new Query()
        .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
        .orderBy(AssetField.CREATION_TIME)
        .limit(12)
        .exe();

      setRecentPhotos(assets);
    } catch (e) {
      console.warn("Could not load recent photos", e);
    }
  }

  // 1. Take Photo via Camera
  async function handleTakePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      onSelectPhoto(result.assets[0].uri);
      onClose();
    }
  }

  // 2. Full System Media Library Picker
  async function handleChooseFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      onSelectPhoto(result.assets[0].uri);
      onClose();
    }
  }

  // 3. Select directly from thumbnail
  async function handleSelectRecent(asset: Asset) {
    // In SDK 57, asset.getUri() gives the file URI
    const uri = await asset.getUri();
    onSelectPhoto(uri);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/40 justify-end"
        onPress={onClose}
      >
        {/* Modal Container */}
        <Pressable
          className="bg-white rounded-t-3xl pt-5 pb-8 px-5 shadow-2xl"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Recent Photos Horizontal Strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row mb-6 -mx-1"
          >
            {recentPhotos.map((photo) => (
              <TouchableOpacity
                key={photo.id}
                activeOpacity={0.8}
                onPress={() => handleSelectRecent(photo)}
                className="mx-1.5"
              >
                <Image
                  source={{ uri: photo.id }} // expo-image can load asset.id directly
                  style={{ width: 68, height: 68, borderRadius: 16 }}
                  contentFit="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Action List */}
          <View className="space-y-4">
            <TouchableOpacity
              onPress={handleTakePhoto}
              className="flex-row items-center py-2.5"
              activeOpacity={0.7}
            >
              <Ionicons name="camera" size={22} color="#0D9488" />
              <Text className="ml-4 text-[16px] font-semibold text-slate-800">
                Take Photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleChooseFromLibrary}
              className="flex-row items-center py-2.5"
              activeOpacity={0.7}
            >
              <Ionicons name="images" size={22} color="#0D9488" />
              <Text className="ml-4 text-[16px] font-semibold text-slate-800">
                Choose From Library
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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

interface RecentPhotoItem {
  id: string;
  uri: string;
}

export function PhotoPickerModal({
  visible,
  onClose,
  onSelectPhoto,
}: PhotoPickerModalProps) {
  const [recentPhotos, setRecentPhotos] = useState<RecentPhotoItem[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

  useEffect(() => {
    if (visible) {
      loadRecentPhotos();
    }
  }, [visible]);

  async function loadRecentPhotos() {
    try {
      setIsLoadingPhotos(true);
      const permission = await requestPermissionsAsync();
      
      const hasPermission =
        permission.granted || permission.accessPrivileges === "limited" || permission.status === "granted";

      if (!hasPermission) {
        console.warn("Photo library permission not granted:", permission.status);
        setIsLoadingPhotos(false);
        return;
      }

      // SDK 57: Sort by newest first (ascending: false)
      const assets = await new Query()
        .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
        .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
        .limit(10)
        .exe();

      // Resolve usable URIs for expo-image
      const items: RecentPhotoItem[] = await Promise.all(
        assets.map(async (asset) => {
          let resolvedUri: string;
          try {
            resolvedUri = await asset.getUri();
          } catch {
            resolvedUri = asset.id;
          }
          return { id: asset.id, uri: resolvedUri };
        })
      );

      setRecentPhotos(items);
    } catch (e) {
      console.warn("Could not load recent photos:", e);
    } finally {
      setIsLoadingPhotos(false);
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
            {/* Tile 1: Camera tile with camera icon badge */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleTakePhoto}
              className="mx-1.5 rounded-2xl overflow-hidden relative justify-center items-center bg-neutral-200"
              style={{ width: 68, height: 68 }}
            >
              {recentPhotos.length > 0 ? (
                <Image
                  source={{ uri: recentPhotos[0].uri }}
                  style={{ width: 68, height: 68 }}
                  contentFit="cover"
                />
              ) : (
                <View className="w-full h-full bg-neutral-300" />
              )}
              {/* Semi-transparent dark overlay with white camera icon */}
              <View className="absolute inset-0 bg-black/30 justify-center items-center">
                <View className="bg-white/80 p-2 rounded-xl justify-center items-center">
                  <Ionicons name="camera" size={20} color="#1E293B" />
                </View>
              </View>
            </TouchableOpacity>

            {/* Next Tiles: Recent device photos */}
            {recentPhotos.slice(1).map((photo) => (
              <TouchableOpacity
                key={photo.id}
                activeOpacity={0.8}
                onPress={() => {
                  onSelectPhoto(photo.uri);
                  onClose();
                }}
                className="mx-1.5 rounded-2xl overflow-hidden"
              >
                <Image
                  source={{ uri: photo.uri }}
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

// src/features/settings/screens/QrCodeScreen.tsx
import { useAuthStore } from "@/core/store/useAuthStore";
import { useMe } from "@/features/auth/api/useMe";
import { useAppTheme } from "@/shared/hooks";
import { toast } from "@/shared/utils/toast";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80";

export function QrCodeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const user = useAuthStore((state) => state.user);
  const { data: me } = useMe();
  const activeUser = me || user;

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  const rawName = (activeUser as any)?.displayName ?? (user as any)?.displayName;
  const displayName =
    typeof rawName === "string" && rawName.trim()
      ? rawName.trim()
      : "Roberto William";

  const rawPhone = (activeUser as any)?.phoneNumber ?? (user as any)?.phoneNumber;
  const phoneNumber =
    typeof rawPhone === "string" && rawPhone.trim()
      ? rawPhone.trim()
      : "+61-827-680-673";

  const rawAvatar = (activeUser as any)?.avatarUrl ?? (user as any)?.avatarUrl;
  const avatarUrl =
    typeof rawAvatar === "string" && rawAvatar.trim()
      ? rawAvatar.trim()
      : DEFAULT_AVATAR;

  // Formatted contact payload encoded in the QR code
  const qrCodeValue = `whatsapp://contact?phone=${encodeURIComponent(
    phoneNumber.replace(/\s+/g, ""),
  )}&name=${encodeURIComponent(displayName)}`;

  async function handleScanQrPress() {
    try {
      if (!cameraPermission || !cameraPermission.granted) {
        const response = await requestCameraPermission();
        if (!response.granted) {
          Alert.alert(
            "Camera Access Needed",
            "Please grant camera access in your device settings to scan QR codes.",
            [{ text: "OK" }],
          );
          return;
        }
      }

      setHasScanned(false);
      setIsScannerOpen(true);
    } catch (e) {
      console.warn("Camera permission request failed:", e);
      Alert.alert("Camera Error", "Could not open the camera scanner.");
    }
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (hasScanned) return;
    setHasScanned(true);
    setIsScannerOpen(false);

    toast.success("QR Code Scanned", data || "Contact scanned successfully!");
    Alert.alert("Contact Scanned", `Data: ${data}`, [{ text: "Done" }]);
  }

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.primary }}
    >
      <StatusBar style="light" />

      {/* Top Header Bar */}
      <View
        style={{ paddingTop: insets.top }}
        className="px-5 pt-2 pb-1 flex-row items-center justify-between"
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-10 h-10 items-center justify-center -ml-2 active:opacity-75"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Center Section: Floating Card */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
          paddingTop: 40,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-[340px] items-center">
          {/* Card Container */}
          <View
            className="w-full bg-white rounded-[28px] items-center px-6 shadow-2xl relative"
            style={[styles.card, { paddingTop: 60, paddingBottom: 28 }]}
          >
            {/* User Avatar Overlapping the Top Edge */}
            <View
              className="absolute -top-12 items-center justify-center"
              style={styles.avatarWrapper}
            >
              <View className="w-[88px] h-[88px] rounded-full overflow-hidden bg-neutral-100 items-center justify-center">
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={200}
                />
              </View>
            </View>

            {/* User Name with generous spacing */}
            <Text
              className="text-[22px] font-bold text-neutral-900 tracking-tight text-center mt-3"
              numberOfLines={1}
            >
              {displayName}
            </Text>

            {/* Phone Number with distinct spacing from name */}
            <Text className="text-[15px] font-medium text-[#6E8597] mt-2 mb-6 text-center">
              {phoneNumber}
            </Text>

            {/* Dynamic Generated Vector QR Code */}
            <View className="items-center justify-center p-3 rounded-2xl bg-white">
              <QRCode
                value={qrCodeValue}
                size={210}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Spacer */}
        <View className="h-8" />

        {/* Scan QR Code Button */}
        <Pressable
          onPress={handleScanQrPress}
          className="flex-row items-center justify-center px-6 h-[50px] rounded-full active:opacity-80"
          style={styles.scanButton}
        >
          <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
          <Text className="ml-2 text-white text-[15px] font-semibold">
            Scan QR code
          </Text>
        </Pressable>
      </ScrollView>

      {/* Safe Area Bottom Pad */}
      <View style={{ height: insets.bottom + 8 }} />

      {/* Interactive Camera QR Scanner Modal */}
      <Modal
        visible={isScannerOpen}
        animationType="slide"
        onRequestClose={() => setIsScannerOpen(false)}
      >
        <View className="flex-1 bg-black relative">
          <StatusBar style="light" />

          {/* Full-Screen Camera View */}
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
          />

          {/* Top Scanner Bar */}
          <View
            style={{ paddingTop: insets.top + 8 }}
            className="px-5 pb-4 flex-row items-center justify-between z-10"
          >
            <Pressable
              onPress={() => setIsScannerOpen(false)}
              className="w-10 h-10 rounded-full bg-black/50 items-center justify-center active:opacity-75"
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>

            <Text className="text-white text-[18px] font-bold">
              Scan QR Code
            </Text>

            <View className="w-10" />
          </View>

          {/* Center Viewfinder Target Frame */}
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-[260px] h-[260px] border-2 border-white/80 rounded-3xl relative items-center justify-center">
              {/* Corner Accents */}
              <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#57B77D] rounded-tl-2xl" />
              <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#57B77D] rounded-tr-2xl" />
              <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#57B77D] rounded-bl-2xl" />
              <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#57B77D] rounded-br-2xl" />
            </View>

            <Text className="text-white/80 text-[14px] font-medium text-center mt-6">
              Align QR code within the frame to scan
            </Text>
          </View>

          {/* Bottom Area */}
          <View
            style={{ paddingBottom: insets.bottom + 20 }}
            className="items-center"
          >
            <Pressable
              onPress={() => setIsScannerOpen(false)}
              className="px-6 py-3 rounded-full bg-white/20 active:opacity-75"
            >
              <Text className="text-white font-semibold text-[15px]">
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 10,
  },
  avatarWrapper: {
    borderWidth: 4,
    borderColor: "#FFFFFF",
    borderRadius: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 8,
  },
  scanButton: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
});

export default QrCodeScreen;

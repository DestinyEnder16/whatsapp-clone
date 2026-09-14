// src/features/settings/components/AppearanceModal.tsx
import { useAppTheme } from "@/shared/hooks";
import { AccentColorKey, ThemeMode } from "@/shared/theme/themes";
import Ionicons from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Modal from "react-native-modal";

export interface AppearanceModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: "system", label: "System Default", icon: "phone-portrait-outline" },
  { mode: "light", label: "Light Mode", icon: "sunny-outline" },
  { mode: "dark", label: "Dark Mode", icon: "moon-outline" },
];

export function AppearanceModal({ isVisible, onClose }: AppearanceModalProps) {
  const {
    mode,
    accentColor,
    setMode,
    setAccentColor,
    colors,
    accentPalettes,
    isDark,
  } = useAppTheme();

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.45}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriver
      hideModalContentWhileAnimating
      style={{ margin: 0, justifyContent: "flex-end" }}
    >
      <View
        className="rounded-t-[32px] px-6 pt-5 pb-8 max-h-[88%]"
        style={{ backgroundColor: colors.card }}
      >
        {/* Top Drag Handle */}
        <View className="items-center mb-3">
          <View
            className="w-12 h-1.5 rounded-full"
            style={{ backgroundColor: colors.border }}
          />
        </View>

        {/* Header */}
        <View className="flex-row items-center justify-between pb-3">
          <Text
            className="text-[20px] font-bold tracking-tight"
            style={{ color: colors.text }}
          >
            Appearance
          </Text>
          <Pressable
            onPress={onClose}
            className="w-8 h-8 rounded-full items-center justify-center active:opacity-70"
            style={{ backgroundColor: colors.surface }}
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* Live Preview Card */}
          <View
            className="rounded-2xl p-4 my-3 border"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.cardBorder,
            }}
          >
            <Text
              className="text-[12px] font-bold uppercase tracking-wider mb-2.5"
              style={{ color: colors.textSecondary }}
            >
              Live Preview
            </Text>

            {/* Mini Chat Preview */}
            <View
              className="rounded-xl p-3 mb-2"
              style={{ backgroundColor: colors.chatBg }}
            >
              {/* Received Bubble */}
              <View
                className="max-w-[78%] self-start px-3 py-2 rounded-2xl rounded-tl-sm mb-2 border"
                style={{
                  backgroundColor: colors.chatBubbleReceived,
                  borderColor: colors.border,
                }}
              >
                <Text
                  className="text-[13px] font-medium"
                  style={{ color: colors.chatBubbleReceivedText }}
                >
                  Hey! How does the new theme look?
                </Text>
              </View>

              {/* Sent Bubble */}
              <View
                className="max-w-[78%] self-end px-3 py-2 rounded-2xl rounded-tr-sm"
                style={{ backgroundColor: colors.chatBubbleSent }}
              >
                <Text
                  className="text-[13px] font-semibold"
                  style={{ color: colors.chatBubbleSentText }}
                >
                  Looks amazing and smooth! 🔥
                </Text>
              </View>
            </View>

            {/* Mini Action Button */}
            <View
              className="h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Text
                className="text-[14px] font-bold"
                style={{ color: colors.primaryText }}
              >
                Accent Action Button
              </Text>
            </View>
          </View>

          {/* Section: Mode Selection */}
          <View className="mt-3">
            <Text
              className="text-[13px] font-bold uppercase tracking-wider mb-2"
              style={{ color: colors.textSecondary }}
            >
              Theme Mode
            </Text>

            <View
              className="rounded-2xl overflow-hidden border"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
              }}
            >
              {THEME_OPTIONS.map((option, idx) => {
                const isSelected = mode === option.mode;
                return (
                  <Pressable
                    key={option.mode}
                    onPress={() => setMode(option.mode)}
                    className="flex-row items-center justify-between px-4 py-3.5 active:opacity-75"
                    style={{
                      borderTopWidth: idx > 0 ? 1 : 0,
                      borderTopColor: colors.border,
                    }}
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        className="text-[15px] font-medium"
                        style={{
                          color: isSelected ? colors.primary : colors.text,
                          fontWeight: isSelected ? "700" : "500",
                        }}
                      >
                        {option.label}
                      </Text>
                    </View>

                    <View
                      className="w-5 h-5 rounded-full items-center justify-center border"
                      style={{
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary : "transparent",
                      }}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section: App Accent Colors */}
          <View className="mt-5">
            <Text
              className="text-[13px] font-bold uppercase tracking-wider mb-2"
              style={{ color: colors.textSecondary }}
            >
              App Accent Color
            </Text>

            <View className="flex-row items-center gap-3">
              {(Object.keys(accentPalettes) as AccentColorKey[]).map((key) => {
                const palette = accentPalettes[key];
                const isSelected = accentColor === key;

                return (
                  <Pressable
                    key={key}
                    onPress={() => setAccentColor(key)}
                    className="flex-1 py-3 px-2 rounded-2xl items-center border active:opacity-80"
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: isSelected ? palette.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    }}
                  >
                    {/* Color Swatch Circle */}
                    <View
                      className="w-9 h-9 rounded-full items-center justify-center mb-1.5 shadow-sm"
                      style={{ backgroundColor: palette.primary }}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      )}
                    </View>
                    <Text
                      className="text-[11px] font-semibold text-center"
                      style={{
                        color: isSelected ? palette.primary : colors.textSecondary,
                      }}
                      numberOfLines={1}
                    >
                      {palette.name.replace("WhatsApp ", "").replace("Ocean ", "").replace("Sunset ", "")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default AppearanceModal;

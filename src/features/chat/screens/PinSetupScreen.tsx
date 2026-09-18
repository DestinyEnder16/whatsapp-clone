// src/features/chat/screens/PinSetupScreen.tsx
import { usePinStore } from "@/core/store/usePinStore";
import { BackButton } from "@/shared/components";
import { useAppTheme } from "@/shared/hooks";
import { toast } from "@/shared/utils/toast";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const KEYPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "delete"],
];

export function PinSetupScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const [pin, setPin] = useState("");
  const setPinCode = usePinStore((state) => state.setPinCode);

  function handleKeyPress(key: string) {
    if (key === "delete") {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    if (key === "") return;

    if (pin.length < 4) {
      const updated = pin + key;
      setPin(updated);

      if (updated.length === 4) {
        // Save to Zustand and persistent device storage
        setPinCode(updated);
        toast.success("PIN Setup Complete", "Your PIN code has been successfully saved.");

        setTimeout(() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(tabs)");
          }
        }, 300);
      }
    }
  }

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.background, paddingTop: insets.top }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Top Header / Back Button */}
      <View className="px-6 pt-2 pb-4">
        <BackButton />
      </View>

      {/* Header Texts */}
      <View className="items-center px-8 mt-2">
        <Text
          className="text-[24px] font-bold tracking-tight text-center"
          style={{ color: colors.text }}
        >
          Setup pin code
        </Text>
        <Text
          className="text-[14px] text-center mt-2.5 leading-5 max-w-[260px]"
          style={{ color: colors.textSecondary }}
        >
          Make sure the code is safe and no one else knows.
        </Text>
      </View>

      {/* 4 PIN Indicator Dots */}
      <View className="flex-row items-center justify-center mt-9 mb-6 gap-x-4">
        {[0, 1, 2, 3].map((index) => {
          const isFilled = index < pin.length;
          return (
            <View
              key={index}
              className="w-[14px] h-[14px] rounded-full"
              style={[
                isFilled
                  ? { backgroundColor: colors.primary }
                  : {
                      borderWidth: 1.5,
                      borderColor: isDark ? colors.cardBorder : "#D1D5DB",
                      backgroundColor: "transparent",
                    },
              ]}
            />
          );
        })}
      </View>

      {/* Numeric Keypad */}
      <View className="flex-1 justify-center items-center px-8 pb-8">
        <View className="gap-y-4">
          {KEYPAD_ROWS.map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row gap-x-8">
              {row.map((item, colIndex) => {
                if (item === "") {
                  return <View key={colIndex} className="w-[76px] h-[76px]" />;
                }

                if (item === "delete") {
                  return (
                    <Pressable
                      key={colIndex}
                      onPress={() => handleKeyPress("delete")}
                      accessibilityRole="button"
                      accessibilityLabel="Delete last digit"
                      className="w-[76px] h-[76px] rounded-full border items-center justify-center active:opacity-75 shadow-sm"
                      style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      }}
                    >
                      <Ionicons
                        name="backspace"
                        size={24}
                        color={colors.text}
                      />
                    </Pressable>
                  );
                }

                return (
                  <Pressable
                    key={colIndex}
                    onPress={() => handleKeyPress(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Digit ${item}`}
                    className="w-[76px] h-[76px] rounded-full border items-center justify-center active:opacity-75 shadow-sm"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    }}
                  >
                    <Text
                      className="text-[26px] font-semibold"
                      style={{ color: colors.text }}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Safe Area Bottom */}
      <View style={{ height: insets.bottom + 12 }} />
    </View>
  );
}

export default PinSetupScreen;


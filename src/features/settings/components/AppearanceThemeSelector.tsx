import { useAppTheme } from "@/shared/hooks";
import { AccentColorKey } from "@/shared/theme/themes";
import Ionicons from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface ThemeOptionItem {
  key: AccentColorKey;
  label: string;
  primaryColor: string;
  lightBg: string;
  pillColor: string;
}

const THEME_OPTIONS: ThemeOptionItem[] = [
  {
    key: "green",
    label: "Green",
    primaryColor: "#57B77D",
    lightBg: "#E8F5ED",
    pillColor: "#57B77D",
  },
  {
    key: "blue",
    label: "Blue",
    primaryColor: "#007CFF",
    lightBg: "#ECF5FF",
    pillColor: "#007CFF",
  },
  {
    key: "red",
    label: "Red",
    primaryColor: "#E8503A",
    lightBg: "#FFF5F5",
    pillColor: "#E8503A",
  },
  {
    key: "orange",
    label: "Orange",
    primaryColor: "#FFB23F",
    lightBg: "#FFF0D9",
    pillColor: "#FFB23F",
  },
];

export function AppearanceThemeSelector() {
  const { accentColor, setAccentColor, colors, isDark } = useAppTheme();

  return (
    <View className="px-6 pt-5 pb-3">
      <Text
        className="text-[17px] font-bold tracking-tight mb-4"
        style={{ color: colors.text }}
      >
        Select a Theme
      </Text>

      <View className="flex-row items-center justify-between gap-3">
        {THEME_OPTIONS.map((theme) => {
          const isSelected = accentColor === theme.key;

          return (
            <Pressable
              key={theme.key}
              onPress={() => setAccentColor(theme.key)}
              className="flex-1 items-center relative active:opacity-85"
            >
              <View
                className="w-full h-[88px] rounded-2xl overflow-hidden justify-between border-2"
                style={{
                  backgroundColor: isDark
                    ? isSelected
                      ? colors.card
                      : colors.surface
                    : theme.lightBg,
                  borderColor: isSelected ? theme.primaryColor : "transparent",
                }}
              >
                {/* Pill Mockups inside Card */}
                <View className="pt-2.5 px-2 items-center">
                  <View
                    className="w-10 h-3 rounded-full mb-1.5"
                    style={{ backgroundColor: theme.pillColor }}
                  />
                  <View
                    className="w-9 h-2.5 rounded-full"
                    style={{
                      backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "#FFFFFF",
                    }}
                  />
                </View>

                {/* Bottom Label Area */}
                {isSelected ? (
                  <View
                    className="w-full py-1.5 items-center justify-center"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    <Text className="text-[12px] font-bold text-white">
                      {theme.label}
                    </Text>
                  </View>
                ) : (
                  <View className="w-full pb-2 items-center justify-center">
                    <Text
                      className="text-[12px] font-bold"
                      style={{ color: theme.primaryColor }}
                    >
                      {theme.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* Floating Checkmark Badge on top-right */}
              {isSelected && (
                <View
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full items-center justify-center shadow-xs"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default AppearanceThemeSelector;

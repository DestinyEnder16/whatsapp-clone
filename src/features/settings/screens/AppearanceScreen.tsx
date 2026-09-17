import { ScreenHeader } from "@/shared/components";
import { useAppTheme } from "@/shared/hooks";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import {
  AppearanceChatPreview,
  AppearanceIconSelector,
  AppearanceThemeSelector,
  AppearanceToggleItem,
} from "../components";

export function AppearanceScreen() {
  const { colors, isDark, setMode } = useAppTheme();
  const [largeEmoji, setLargeEmoji] = useState(false);

  const handleToggleNightMode = (val: boolean) => {
    setMode(val ? "dark" : "light");
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Light status bar icons on top of the vibrant primary header */}
      <StatusBar style="light" />

      {/* Primary Header with Back button and Title */}
      <ScreenHeader title="Appearance" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Top Chat Preview Card */}
        <AppearanceChatPreview />

        {/* Theme Palette Selection (Green, Blue, Red, Orange) */}
        <AppearanceThemeSelector />

        {/* Setting Toggles: Night Mode & Large Emoji */}
        <View className="mt-1">
          <AppearanceToggleItem
            iconName="moon"
            title="Night Mode"
            value={isDark}
            onValueChange={handleToggleNightMode}
          />
          <AppearanceToggleItem
            iconName="happy"
            title="Large Emoji"
            value={largeEmoji}
            onValueChange={setLargeEmoji}
          />
        </View>

        {/* App Icon Customization */}
        <AppearanceIconSelector />
      </ScrollView>
    </View>
  );
}

export default AppearanceScreen;

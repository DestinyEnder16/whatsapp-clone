// src/shared/hooks/useAppTheme.ts
import { useEffect, useMemo } from "react";
import { useColorScheme as useDeviceColorScheme } from "react-native";
import { useColorScheme as useNativeWindColorScheme } from "nativewind";
import { useThemeStore } from "@/core/store/useThemeStore";
import {
  ACCENT_PALETTES,
  BASE_THEMES,
  type AccentColorKey,
  type AppThemeColors,
  type ThemeMode,
} from "@/shared/theme/themes";

export function useAppTheme() {
  const deviceColorScheme = useDeviceColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();

  const mode = useThemeStore((state) => state.mode);
  const accentColor = useThemeStore((state) => state.accentColor);
  const setMode = useThemeStore((state) => state.setMode);
  const setAccentColor = useThemeStore((state) => state.setAccentColor);

  const isDark =
    mode === "system" ? deviceColorScheme === "dark" : mode === "dark";

  // Synchronize NativeWind with the active mode so dark: classes work seamlessly
  useEffect(() => {
    setColorScheme(mode);
  }, [mode, setColorScheme]);

  const colors: AppThemeColors = useMemo(() => {
    const base = isDark ? BASE_THEMES.dark : BASE_THEMES.light;
    const accent = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.green;

    return {
      ...base,
      primary: accent.primary,
      primaryDark: accent.primaryDark,
      primaryLight: accent.primaryLight,
      primaryText: accent.primaryText,
      chatBubbleSent: accent.primary,
      chatBubbleSentText: accent.primaryText,
    };
  }, [isDark, accentColor]);

  return {
    mode,
    isDark,
    accentColor,
    setMode,
    setAccentColor,
    colors,
    accentPalettes: ACCENT_PALETTES,
  };
}

export default useAppTheme;

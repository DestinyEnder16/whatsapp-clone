// src/shared/hooks/useAppTheme.ts
import { useMemo } from "react";
import { useColorScheme as useDeviceColorScheme } from "react-native";
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

  const mode = useThemeStore((state) => state.mode);
  const accentColor = useThemeStore((state) => state.accentColor);
  const setMode = useThemeStore((state) => state.setMode);
  const setAccentColor = useThemeStore((state) => state.setAccentColor);

  const isDark =
    mode === "system" ? deviceColorScheme === "dark" : mode === "dark";

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

  return useMemo(
    () => ({
      mode,
      isDark,
      accentColor,
      setMode,
      setAccentColor,
      colors,
      accentPalettes: ACCENT_PALETTES,
    }),
    [mode, isDark, accentColor, setMode, setAccentColor, colors],
  );
}

export default useAppTheme;


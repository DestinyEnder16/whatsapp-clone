import { configureNotificationHandler } from "@/services/notifications";
import { useAppTheme } from "@/shared/hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useColorScheme as useNativeWindColorScheme } from "nativewind";
import React, { useEffect } from "react";
import { Text, TextInput } from "react-native";
import Toast from "react-native-toast-message";
import "../../global.css";

// Keep the splash screen visible while fonts and initial state are loading
SplashScreen.preventAutoHideAsync().catch(() => {});

// Set default font family for all native Text & TextInput components across the app
if ((Text as any).defaultProps == null) {
  (Text as any).defaultProps = {};
}
(Text as any).defaultProps.style = { fontFamily: "SFProDisplay-Regular" };

if ((TextInput as any).defaultProps == null) {
  (TextInput as any).defaultProps = {};
}
(TextInput as any).defaultProps.style = { fontFamily: "SFProDisplay-Regular" };

const queryClient = new QueryClient();

export default function RootLayout() {
  const { mode, colors, isDark } = useAppTheme();
  const { setColorScheme } = useNativeWindColorScheme();

  const [fontsLoaded, fontError] = useFonts({
    "SFProDisplay-Regular": require("../../assets/fonts/sf-pro-display/SFPRODISPLAYREGULAR.otf"),
    "SFProDisplay-Medium": require("../../assets/fonts/sf-pro-display/SFPRODISPLAYMEDIUM.otf"),
    "SFProDisplay-Bold": require("../../assets/fonts/sf-pro-display/SFPRODISPLAYBOLD.otf"),
    "SFProDisplay-SemiboldItalic": require("../../assets/fonts/sf-pro-display/SFPRODISPLAYSEMIBOLDITALIC.otf"),
  });

  // Synchronize NativeWind once at the app root only when theme mode changes
  useEffect(() => {
    setColorScheme(mode);
  }, [mode, setColorScheme]);

  // Configure Expo foreground notification handler
  useEffect(() => {
    configureNotificationHandler();
  }, []);

  // Hide splash screen once fonts are loaded or on error
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Prevent app from rendering with system fallback fonts until SF Pro is loaded
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>

      {/* this allows the toasts to be rendered globally over all screens and modals */}
      <Toast />
    </QueryClientProvider>
  );
}

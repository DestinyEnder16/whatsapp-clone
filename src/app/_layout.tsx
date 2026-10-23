import { queryClient } from '@/core/lib/queryClient';
import { configureNotificationHandler } from '@/services/notifications';
import { useAppTheme } from '@/shared/hooks';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import '../../global.css';

// Keep the splash screen visible while fonts and initial state are loading
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { mode, colors, isDark } = useAppTheme();
  const { setColorScheme } = useNativeWindColorScheme();

  const [fontsLoaded, fontError] = useFonts({
    SFPRODISPLAY: require('../../assets/fonts/sf-pro-display/SFPRODISPLAYREGULAR.otf'),
    SFPRODISPLAYREGULAR: require('../../assets/fonts/sf-pro-display/SFPRODISPLAYREGULAR.otf'),
    SFPRODISPLAYMEDIUM: require('../../assets/fonts/sf-pro-display/SFPRODISPLAYMEDIUM.otf'),
    SFPRODISPLAYBOLD: require('../../assets/fonts/sf-pro-display/SFPRODISPLAYBOLD.otf'),
    SFPRODISPLAYSEMIBOLDITALIC: require('../../assets/fonts/sf-pro-display/SFPRODISPLAYSEMIBOLDITALIC.otf'),
    'SFProDisplay-Regular': require('../../assets/fonts/sf-pro-display/SFPRODISPLAYREGULAR.otf'),
    'SFProDisplay-Medium': require('../../assets/fonts/sf-pro-display/SFPRODISPLAYMEDIUM.otf'),
    'SFProDisplay-Bold': require('../../assets/fonts/sf-pro-display/SFPRODISPLAYBOLD.otf'),
    'SFProDisplay-SemiboldItalic': require('../../assets/fonts/sf-pro-display/SFPRODISPLAYSEMIBOLDITALIC.otf'),
    'SF Pro Display': require('../../assets/fonts/sf-pro-display/SFPRODISPLAYREGULAR.otf'),
  });

  // Synchronize NativeWind once at the app root only when theme mode changes
  useEffect(() => {
    setColorScheme(mode);
  }, [mode, setColorScheme]);

  // Configure Expo foreground notification handler
  useEffect(() => {
    configureNotificationHandler();
  }, []);

  // Hide splash screen once fonts are loaded or log on error
  useEffect(() => {
    if (fontError) {
      console.warn('Error loading fonts:', fontError);
    }
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
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
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

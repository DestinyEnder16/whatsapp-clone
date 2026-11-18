// src/app/_layout.tsx
import { queryClient } from '@/core/lib/queryClient';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useNavigationStore } from '@/core/store/useNavigationStore';
import {
  conversationIdFromPath,
  decideRouteGuard,
} from '@/services/navigation/routeGuard';
import {
  configureNotificationHandler,
  extractConversationId,
  isValidUuid,
  setupNotificationNavigation,
} from '@/services/notifications';
import { useAppTheme } from '@/shared/hooks';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { NavigationBar } from 'expo-navigation-bar';
import { router, Stack, usePathname, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import '../../global.css';

// Keep the splash screen visible while fonts and initial state are loading
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { colors, isDark } = useAppTheme();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const segments = useSegments();
  const pathname = usePathname();

  // 1. Configure foreground notification handler and response listener (cold & warm)
  useEffect(() => {
    configureNotificationHandler();
    const cleanupNotifications = setupNotificationNavigation();
    return () => cleanupNotifications();
  }, []);

  // 2. Listen to incoming deep links (e.g. whatsappclone://chat/<id>)
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const conversationId =
        extractConversationId(parsed.queryParams as any) ||
        conversationIdFromPath(parsed.path);

      if (conversationId && isValidUuid(conversationId)) {
        const { isAuthenticated: authed, user: currentUser } =
          useAuthStore.getState();

        // A signed-in user with a finished profile is routed by Expo Router
        // itself (it opens the link); pushing here as well would stack the
        // chat twice. Only retain the destination when the user cannot be
        // taken there yet, so login/profile completion can resume it.
        if (!(authed && currentUser?.profileComplete)) {
          useNavigationStore.getState().setPendingConversationId(conversationId);
        }
      }
    };

    void Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => sub.remove();
  }, []);

  // 3. Layout-level session guard: enforces presentation and navigation security.
  //    The decision itself lives in decideRouteGuard (pure, unit tested).
  useEffect(() => {
    const decision = decideRouteGuard({
      hasHydrated,
      isAuthenticated,
      profileComplete: !!user?.profileComplete,
      segments,
    });

    if (decision.action === 'redirect') {
      // Keep the chat the user was trying to open for after login/profile.
      if (decision.captureConversationId) {
        useNavigationStore
          .getState()
          .setPendingConversationId(decision.captureConversationId);
      }
      router.replace(decision.to);
    } else if (decision.action === 'resume-pending') {
      const pending = useNavigationStore.getState().consumePendingDestination();
      router.replace((pending?.pathname ?? '/(tabs)') as any);
    }
  }, [hasHydrated, isAuthenticated, user?.profileComplete, segments, pathname]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />

        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="pin-setup" />
        </Stack.Protected>
      </Stack>

      <Toast />
    </>
  );
}

export default function RootLayout() {
  const { mode, isDark } = useAppTheme();
  const { setColorScheme } = useNativeWindColorScheme();

  const hasHydrated = useAuthStore((state) => state.hasHydrated);

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

  useEffect(() => {
    NavigationBar.setStyle(isDark ? 'light' : 'dark');
  }, [isDark]);

  // The app is ready once fonts are loaded (or failed) AND persisted auth has
  // been restored. Rendering earlier would mount private screens, or redirect a
  // signed-in user to onboarding, from the empty pre-hydration auth state.
  const isReady = (fontsLoaded || !!fontError) && hasHydrated;

  // Hide splash screen only when the app is ready
  useEffect(() => {
    if (fontError) {
      console.warn('Error loading fonts:', fontError);
    }
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontError, isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  );
}

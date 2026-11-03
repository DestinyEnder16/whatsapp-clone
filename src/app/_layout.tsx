// src/app/_layout.tsx
import { queryClient } from '@/core/lib/queryClient';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useNavigationStore } from '@/core/store/useNavigationStore';
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
        extractConversationId({ path: parsed.path });

      if (conversationId && isValidUuid(conversationId)) {
        const { isAuthenticated: authed, user: currentUser, hasHydrated: hydrated } =
          useAuthStore.getState();

        if (hydrated && authed && currentUser?.profileComplete) {
          router.push({
            pathname: '/chat/[id]',
            params: { id: conversationId },
          } as any);
        } else {
          // If signed out, retain the destination until authentication completes
          useNavigationStore.getState().setPendingConversationId(conversationId);
        }
      }
    };

    void Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => sub.remove();
  }, []);

  // 3. Layout-level session guard: enforces presentation and navigation security
  useEffect(() => {
    if (!hasHydrated) return;

    const firstSegment = segments[0];
    const isProtectedSegment =
      firstSegment === '(tabs)' ||
      firstSegment === 'chat' ||
      firstSegment === 'settings' ||
      firstSegment === 'pin-setup';

    // Signed-out user trying to access or currently viewing a protected destination
    if (!isAuthenticated) {
      if (isProtectedSegment) {
        // If route has conversation ID, capture it before redirecting
        if (firstSegment === 'chat' && segments[1] && isValidUuid(segments[1])) {
          useNavigationStore.getState().setPendingConversationId(segments[1]);
        }
        // Immediately kick out of protected presentation
        router.replace('/onboarding');
      }
      return;
    }

    // Authenticated user but profile setup not completed
    if (isAuthenticated && !user?.profileComplete) {
      if (isProtectedSegment) {
        router.replace('/profile');
      }
      return;
    }

    // Authenticated user with completed profile visiting onboarding or auth pages
    if (isAuthenticated && user?.profileComplete) {
      if (firstSegment === 'onboarding' || firstSegment === '(auth)') {
        const pending =
          useNavigationStore.getState().consumePendingDestination();
        if (pending?.pathname) {
          router.replace(pending.pathname as any);
        } else {
          router.replace('/(tabs)');
        }
      }
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

  // Hide splash screen once fonts are loaded or log on error
  useEffect(() => {
    if (fontError) {
      console.warn('Error loading fonts:', fontError);
    }
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  );
}

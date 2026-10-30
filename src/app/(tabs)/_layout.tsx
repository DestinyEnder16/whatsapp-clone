// src/app/(tabs)/_layout.tsx
import { useAuthStore } from '@/core/store/useAuthStore';
import { useAppTheme } from '@/shared/hooks';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  // 1. Wait for hydration before enforcing session boundaries
  if (!hasHydrated) {
    return null;
  }

  // 2. Guard: if user is not authenticated, redirect to public onboarding
  if (!isAuthenticated) {
    return <Redirect href="/onboarding" />;
  }

  // 3. Guard: if profile setup is incomplete, redirect to profile screen
  if (!user?.profileComplete) {
    return <Redirect href="/profile" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 80 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'SFPRODISPLAYMEDIUM',
        },
      }}
    >
      <Tabs.Screen
        name="call"
        options={{
          title: 'Calls',
          tabBarAccessibilityLabel: 'Calls tab',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? 'call' : 'call-outline'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarAccessibilityLabel: 'Chats tab',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="setting"
        options={{
          title: 'Settings',
          tabBarAccessibilityLabel: 'Settings tab',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? 'cog' : 'cog-outline'}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

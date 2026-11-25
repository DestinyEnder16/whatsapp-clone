// src/app/index.tsx
import { useAuthStore } from '@/core/store/useAuthStore';
import { useNavigationStore } from '@/core/store/useNavigationStore';
import { Redirect } from 'expo-router';

export default function Index() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const pendingDestination = useNavigationStore(
    (state) => state.pendingDestination
  );
  const consumePendingDestination = useNavigationStore(
    (state) => state.consumePendingDestination
  );

  // 1. Wait until storage finishes rehydrating
  if (!hasHydrated) {
    return null;
  }

  // 2. If authenticated and profile is complete: resume intended destination or go to tabs
  if (isAuthenticated && user?.profileComplete) {
    if (pendingDestination?.pathname) {
      const dest = consumePendingDestination();
      if (dest?.pathname) {
        return <Redirect href={dest.pathname as any} />;
      }
    }
    return <Redirect href="/(tabs)" />;
  }

  // 3. If authenticated but has not finished profile setup -> go to profile
  if (isAuthenticated && !user?.profileComplete) {
    return <Redirect href="/profile" />;
  }

  // 4. Otherwise, show onboarding
  return <Redirect href="/onboarding" />;
}

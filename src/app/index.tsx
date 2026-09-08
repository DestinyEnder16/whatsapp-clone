// src/app/index.tsx
import { useAuthStore } from "@/core/store/useAuthStore";
import { Redirect } from "expo-router";

export default function Index() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  // 1. Wait until AsyncStorage finishes restoring data from disk
  if (!hasHydrated) {
    return null; // Or a splash / loading spinner
  }

  // 2. If logged in and profile complete -> go to chats
  if (isAuthenticated && user?.profileComplete) {
    return <Redirect href="/(tabs)" />;
  }

  // 3. If logged in but hasn't finished profile -> go to profile setup
  if (isAuthenticated && !user?.profileComplete) {
    return <Redirect href="/profile" />;
  }

  // 4. Otherwise, show onboarding
  return <Redirect href="/onboarding" />;
}

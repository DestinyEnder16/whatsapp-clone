import { useAppTheme } from "@/shared/hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import "../../global.css";

const queryClient = new QueryClient();

export default function RootLayout() {
  const { colors, isDark } = useAppTheme();

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

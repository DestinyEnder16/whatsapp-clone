import { useAppTheme } from "@/shared/hooks";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

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
          height: 80,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "SFProDisplay-Medium",
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="call"
        options={{
          title: "Calls",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? "call" : "call-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Chats",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="setting"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? "cog" : "cog-outline"}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

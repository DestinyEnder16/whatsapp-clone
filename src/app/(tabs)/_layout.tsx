import colors from "@/shared/theme/colors";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[400],
        tabBarInactiveTintColor: colors.neutral[300],
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: colors.other.divider,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
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

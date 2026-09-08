// src/features/chat/screens/ChatScreen.tsx
import { useConversations } from "@/features/chat/api/useConversations";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export function ChatScreen() {
  const {
    data: conversations,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useConversations();

  useEffect(() => {
    if (error) {
      console.error("❌ Error fetching conversations:", error);
    }

    if (conversations) {
      console.log(
        "✅ Fetched conversations:",
        JSON.stringify(conversations, null, 2),
      );
    }
  }, [conversations, error]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <View>
      <Text>Chats</Text>
    </View>
  );
}

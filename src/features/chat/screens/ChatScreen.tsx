import { useConversations } from "@/features/chat/api/useConversations";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export function ChatScreen() {
  const {
    data: conversations,
    isLoading,
    refetch,
    isRefetching,
  } = useConversations();

  useEffect(function () {
    if (!isLoading) {
      console.log(conversations);
    }
  }, []);

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

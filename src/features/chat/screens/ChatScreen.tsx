import { ContactsEmptyState } from "@/features/contacts";
import { useConversations } from "@/features/chat/api/useConversations";
import { TabScreen } from "@/shared/components";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { PinCodeModal } from "../components";

export function ChatScreen() {
  const {
    data: conversations,
    isLoading,
    error,
    refetch,
    isRefetching,
    isFetched,
  } = useConversations();
  const [showModal, setShowModal] = useState(false);

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

  useEffect(() => {
    if (!isFetched) return;

    const timer = setTimeout(() => {
      console.log("modal shown");
      setShowModal(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [isFetched]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <TabScreen>
      <View className="flex-1">
        <Text className="px-4 pt-2 pb-2 text-neutral-900 font-bold text-2xl tracking-tight">
          Chats
        </Text>
        <ContactsEmptyState />
        <PinCodeModal
          isVisible={showModal}
          onCancel={() => setShowModal(false)}
          onConfirm={() => setShowModal(false)}
        />
      </View>
    </TabScreen>
  );
}

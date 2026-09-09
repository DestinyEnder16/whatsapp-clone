import { useConversations } from "@/features/chat/api/useConversations";
import { ContactsEmptyState } from "@/features/contacts";
import { TabHeader, TabScreen } from "@/shared/components";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { PinCodeModal } from "../components";

export function ChatScreen() {
  const {
    data: conversations,
    isLoading,
    error,
    isFetched,
  } = useConversations();
  const [showModal, setShowModal] = useState(false);

  // to check for conversations
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

  // to show modal requesting pin code
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
        <TabHeader title="Chats" />
        {conversations?.items.length === 0 ? (
          <ContactsEmptyState />
        ) : (
          <Text>hello world!</Text>
        )}
        <PinCodeModal
          isVisible={showModal}
          onCancel={() => setShowModal(false)}
          onConfirm={() => setShowModal(false)}
        />
      </View>
    </TabScreen>
  );
}

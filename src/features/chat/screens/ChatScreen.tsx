// src/features/chat/screens/ChatScreen.tsx
import { usePinStore } from "@/core/store/usePinStore";
import { ContactsEmptyState } from "@/features/contacts";
import { useAppTheme } from "@/shared/hooks";
import { toast } from "@/shared/utils/toast";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useConversations } from "../api/useConversations";
import { useCreateDirectConversation } from "../api/useCreateDirectConversation";
import { useSearchUsers } from "../api/useSearchUsers";
import {
  ConversationInfoModal,
  ConversationItem,
  type ConversationItemData,
  PinCodeModal,
  StartConversationModal,
} from "../components";

export function ChatScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const {
    data: conversations,
    isLoading,
    error,
    isFetched,
    refetch,
    isRefetching,
  } = useConversations();

  const [searchQuery, setSearchQuery] = useState("");
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationItemData | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const isPinCodeSet = usePinStore((state) => state.isPinCodeSet);

  const { data: userSearchResults, isLoading: isSearchingUsers } =
    useSearchUsers(searchQuery);
  const createDirectMutation = useCreateDirectConversation();

  // Show PIN modal 5 seconds after load if not yet configured
  useEffect(() => {
    if (!isFetched || isPinCodeSet) return;

    const timer = setTimeout(() => {
      setShowPinModal(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [isFetched, isPinCodeSet]);

  // Filter existing conversations based on search query
  const filteredConversations = useMemo(() => {
    const items = (conversations?.items || []) as ConversationItemData[];
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      const name =
        item.type === "group"
          ? (item as any).name || ""
          : (item as any).otherParticipant?.displayName || "";
      const preview = item.latestMessage?.preview || "";
      return (
        name.toLowerCase().includes(query) ||
        preview.toLowerCase().includes(query)
      );
    });
  }, [conversations?.items, searchQuery]);

  const handleStartChatWithUser = (userId: string, name: string) => {
    if (createDirectMutation.isPending) return;

    createDirectMutation.mutate(
      { participantId: userId },
      {
        onSuccess: (newConv) => {
          toast.success(
            "Conversation Created",
            `Direct conversation created with ${name}`
          );
          setSearchQuery("");
          setSelectedConversation(newConv as ConversationItemData);
        },
        onError: (err: any) => {
          toast.error("Error", err?.message || "Could not start conversation");
        },
      }
    );
  };

  const isSearching = searchQuery.trim().length > 0;
  const hasConversations = (conversations?.items?.length || 0) > 0;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style="light" />

      {/* Top Green Header matching the attached design */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingTop: insets.top + 8,
          paddingBottom: 16,
          paddingHorizontal: 20,
        }}
      >
        {/* Title */}
        <Text className="text-white text-[28px] font-bold tracking-tight mb-3">
          Chats
        </Text>

        {/* Search Bar inside Header */}
        <View
          className="flex-row items-center px-4 py-2.5 rounded-2xl"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.22)" }}
        >
          <Ionicons
            name="search"
            size={19}
            color="#FFFFFF"
            style={{ opacity: 0.85, marginRight: 10 }}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search chat, people and more..."
            placeholderTextColor="rgba(255, 255, 255, 0.75)"
            className="flex-1 text-white text-[15px]"
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color="rgba(255, 255, 255, 0.85)"
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isSearching ? (
        /* Search Results View */
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View>
              {/* Existing matching conversations */}
              {filteredConversations.length > 0 && (
                <View className="px-4 pt-3 pb-1">
                  <Text
                    className="text-[12px] font-semibold uppercase tracking-wider"
                    style={{ color: colors.textMuted }}
                  >
                    Conversations
                  </Text>
                </View>
              )}
            </View>
          )}
          renderItem={({ item, index }) => (
            <ConversationItem
              item={item}
              isOnline={index % 2 === 0}
              onPress={() => setSelectedConversation(item)}
            />
          )}
          ListFooterComponent={() => (
            <View className="mt-4">
              {/* API People Search Results */}
              <View className="px-4 pb-2 border-t pt-3" style={{ borderColor: colors.divider }}>
                <Text
                  className="text-[12px] font-semibold uppercase tracking-wider"
                  style={{ color: colors.textMuted }}
                >
                  People on ChatMe
                </Text>
              </View>

              {isSearchingUsers || createDirectMutation.isPending ? (
                <View className="py-4 items-center justify-center flex-row">
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text
                    className="text-[13px] ml-2 font-medium"
                    style={{ color: colors.primary }}
                  >
                    {createDirectMutation.isPending
                      ? "Creating conversation..."
                      : "Searching directory..."}
                  </Text>
                </View>
              ) : userSearchResults?.items && userSearchResults.items.length > 0 ? (
                userSearchResults.items.map((user) => {
                  const userName =
                    typeof user.displayName === "string" && user.displayName
                      ? user.displayName
                      : "ChatMe User";

                  return (
                    <Pressable
                      key={user.id}
                      onPress={() => handleStartChatWithUser(user.id, userName)}
                      disabled={createDirectMutation.isPending}
                      className="flex-row items-center px-4 py-3 active:opacity-70"
                    >
                      <View
                        className="w-12 h-12 rounded-full overflow-hidden items-center justify-center mr-3.5 border"
                        style={{
                          backgroundColor: colors.primaryLight,
                          borderColor: colors.border,
                        }}
                      >
                        {user.avatarUrl ? (
                          <Image
                            source={{ uri: user.avatarUrl }}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                          />
                        ) : (
                          <Text
                            className="text-[18px] font-bold"
                            style={{ color: colors.primaryDark }}
                          >
                            {userName.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>

                      <View className="flex-1 mr-2">
                        <Text
                          className="text-[16px] font-bold"
                          style={{ color: colors.text }}
                        >
                          {userName}
                        </Text>
                        <Text
                          className="text-[13px] mt-0.5"
                          style={{ color: colors.textSecondary }}
                        >
                          Tap to start direct conversation
                        </Text>
                      </View>

                      <Ionicons
                        name="add-circle"
                        size={26}
                        color={colors.primary}
                      />
                    </Pressable>
                  );
                })
              ) : searchQuery.trim().length >= 3 ? (
                <View className="py-4 items-center">
                  <Text
                    className="text-[13px]"
                    style={{ color: colors.textMuted }}
                  >
                    No more users found with "{searchQuery}"
                  </Text>
                </View>
              ) : (
                <View className="py-4 items-center">
                  <Text
                    className="text-[13px]"
                    style={{ color: colors.textMuted }}
                  >
                    Type at least 3 characters to search directory
                  </Text>
                </View>
              )}
            </View>
          )}
        />
      ) : !hasConversations ? (
        /* Empty State */
        <ContactsEmptyState onStartChat={() => setShowStartModal(true)} />
      ) : (
        /* Conversations List */
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item, index }) => (
            <ConversationItem
              item={item}
              isOnline={index % 2 === 0}
              onPress={() => setSelectedConversation(item)}
            />
          )}
        />
      )}

      {/* Floating Action Button (+) matching attached image */}
      <Pressable
        onPress={() => setShowStartModal(true)}
        className="w-14 h-14 rounded-full items-center justify-center absolute bottom-6 right-6 active:opacity-85 shadow-lg"
        style={{
          backgroundColor: colors.primary,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </Pressable>

      {/* Start Conversation Modal */}
      <StartConversationModal
        visible={showStartModal}
        onClose={() => setShowStartModal(false)}
        onConversationCreated={(newId) => {
          const found = conversations?.items?.find((c) => c.id === newId);
          if (found) {
            setSelectedConversation(found as ConversationItemData);
          }
        }}
      />

      {/* Conversation Info Modal (since chatting functionality is paused for now) */}
      <ConversationInfoModal
        conversation={selectedConversation}
        visible={Boolean(selectedConversation)}
        onClose={() => setSelectedConversation(null)}
      />

      {/* PIN code request modal */}
      <PinCodeModal
        isVisible={showPinModal && !isPinCodeSet}
        onCancel={() => setShowPinModal(false)}
        onConfirm={() => {
          setShowPinModal(false);
          router.push("/pin-setup" as any);
        }}
      />
    </View>
  );
}

export default ChatScreen;

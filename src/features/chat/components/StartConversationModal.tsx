// src/features/chat/components/StartConversationModal.tsx
import { useSyncContacts } from "@/features/contacts/hooks/useSyncContacts";
import { useAppTheme } from "@/shared/hooks";
import { toast } from "@/shared/utils/toast";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCreateDirectConversation } from "../api/useCreateDirectConversation";
import { useSearchUsers } from "../api/useSearchUsers";

interface StartConversationModalProps {
  visible: boolean;
  onClose: () => void;
  onConversationCreated?: (conversationId: string) => void;
}

interface ContactOption {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  subtitle?: string;
}

export function StartConversationModal({
  visible,
  onClose,
  onConversationCreated,
}: StartConversationModalProps) {
  const { colors, isDark } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState("");

  const { matches } = useSyncContacts();
  const { data: searchResults, isLoading: isSearching } =
    useSearchUsers(searchQuery);
  const createDirectMutation = useCreateDirectConversation();

  // Combine phonebook matched contacts and API search results
  const contactsList: ContactOption[] = [];
  const seenIds = new Set<string>();

  // 1. If searching, prioritize search results from GET /v1/users/search
  if (searchQuery.trim().length >= 3 && searchResults?.items) {
    for (const item of searchResults.items) {
      if (item.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        contactsList.push({
          id: item.id,
          displayName:
            typeof item.displayName === "string" && item.displayName
              ? item.displayName
              : "User",
          avatarUrl: item.avatarUrl,
          subtitle: "Found on ChatMe",
        });
      }
    }
  }

  // 2. Also populate phonebook matches from useSyncContacts
  for (const match of matches) {
    if (match.user?.id && !seenIds.has(match.user.id)) {
      seenIds.add(match.user.id);
      contactsList.push({
        id: match.user.id,
        displayName:
          match.localName ||
          (typeof match.user.displayName === "string"
            ? match.user.displayName
            : "Contact"),
        avatarUrl: match.user.avatarUrl,
        subtitle: match.matchedPhoneNumber || "Contact",
      });
    }
  }

  const handleSelectContact = (contact: ContactOption) => {
    if (createDirectMutation.isPending) return;

    createDirectMutation.mutate(
      { participantId: contact.id },
      {
        onSuccess: (data) => {
          toast.success(
            "Conversation Created",
            `Started conversation with ${contact.displayName}`
          );
          onClose();
          if (data?.id && onConversationCreated) {
            onConversationCreated(data.id);
          }
        },
        onError: (err: any) => {
          toast.error(
            "Failed",
            err?.message || "Could not start conversation"
          );
        },
      }
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        className="flex-1"
        style={{ backgroundColor: colors.background }}
      >
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b"
          style={{ borderColor: colors.divider }}
        >
          <View>
            <Text
              className="text-[20px]"
              style={{ color: colors.text, fontFamily: "SFPRODISPLAYBOLD" }}
            >
              Start Conversation
            </Text>
            <Text
              className="text-[13px] mt-0.5"
              style={{ color: colors.textSecondary, fontFamily: "SFPRODISPLAYREGULAR" }}
            >
              Select a contact to create a direct conversation
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            className="w-9 h-9 rounded-full items-center justify-center active:opacity-70"
            style={{ backgroundColor: colors.surface }}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="px-5 pt-3 pb-2">
          <View
            className="flex-row items-center px-3.5 py-2.5 rounded-xl border"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
          >
            <Ionicons
              name="search"
              size={18}
              color={colors.textMuted}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name (min 3 chars)..."
              placeholderTextColor={colors.textMuted}
              className="flex-1 text-[15px]"
              style={{ color: colors.text, fontFamily: "SFPRODISPLAYREGULAR" }}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            )}
          </View>
        </View>

        {/* Loading Indicator */}
        {(isSearching || createDirectMutation.isPending) && (
          <View className="py-2 items-center justify-center flex-row">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text
              className="text-[13px] ml-2"
              style={{ color: colors.primary, fontFamily: "SFPRODISPLAYMEDIUM" }}
            >
              {createDirectMutation.isPending
                ? "Creating conversation..."
                : "Searching..."}
            </Text>
          </View>
        )}

        {/* Contacts List */}
        <FlatList
          data={contactsList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          ListEmptyComponent={() => (
            <View className="items-center justify-center py-16 px-8">
              <Ionicons
                name="people-outline"
                size={48}
                color={colors.textMuted}
                style={{ marginBottom: 12 }}
              />
              <Text
                className="text-[16px] text-center"
                style={{ color: colors.text, fontFamily: "SFPRODISPLAYBOLD" }}
              >
                {searchQuery.trim().length >= 3
                  ? "No contacts found"
                  : "No contacts available"}
              </Text>
              <Text
                className="text-[13px] text-center mt-1"
                style={{ color: colors.textSecondary, fontFamily: "SFPRODISPLAYREGULAR" }}
              >
                {searchQuery.trim().length >= 3
                  ? "Try searching for another display name"
                  : "Type a name above to search the directory"}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelectContact(item)}
              disabled={createDirectMutation.isPending}
              className="flex-row items-center px-5 py-3 active:opacity-70"
            >
              <View
                className="w-12 h-12 rounded-full overflow-hidden items-center justify-center mr-3.5 border"
                style={{
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.border,
                }}
              >
                {item.avatarUrl ? (
                  <Image
                    source={{ uri: item.avatarUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : (
                  <Text
                    className="text-[18px]"
                    style={{ color: colors.primaryDark, fontFamily: "SFPRODISPLAYBOLD" }}
                  >
                    {item.displayName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>

              <View className="flex-1 mr-2">
                <Text
                  className="text-[16px]"
                  style={{ color: colors.text, fontFamily: "SFPRODISPLAYBOLD" }}
                  numberOfLines={1}
                >
                  {item.displayName}
                </Text>
                {item.subtitle && (
                  <Text
                    className="text-[13px] mt-0.5"
                    style={{ color: colors.textSecondary, fontFamily: "SFPRODISPLAYREGULAR" }}
                    numberOfLines={1}
                  >
                    {item.subtitle}
                  </Text>
                )}
              </View>

              <Ionicons
                name="chatbubble-ellipses-outline"
                size={22}
                color={colors.primary}
              />
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

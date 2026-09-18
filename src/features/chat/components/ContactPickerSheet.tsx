// src/features/chat/components/ContactPickerSheet.tsx
import { useAppTheme } from "@/shared/hooks";
import { toast } from "@/shared/utils/toast";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  SectionList,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreateDirectConversation } from "../api/useCreateDirectConversation";
import { useSearchUsers } from "../api/useSearchUsers";

export interface ContactPickerItem {
  id: string;
  name: string;
  phoneOrHandle: string;
  avatarUrl?: string | null;
}

interface ContactPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectContact?: (contact: ContactPickerItem) => void;
}

// Design-matched initial contacts for instant preview matching the UI mockups
const MOCKUP_CONTACTS: ContactPickerItem[] = [
  {
    id: "annette-black",
    name: "Annette Black",
    phoneOrHandle: "+61-827-680-673",
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "arlene-mccoy",
    name: "Arlene McCoy",
    phoneOrHandle: "+61-827-680-673",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "annie-miles",
    name: "Annie Miles",
    phoneOrHandle: "+61-827-680-673",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "bourtney-henry",
    name: "Bourtney Henry",
    phoneOrHandle: "+61-827-680-673",
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "bianne-russell",
    name: "Bianne Russell",
    phoneOrHandle: "+61-827-680-673",
    avatarUrl:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "bessie-cooper",
    name: "Bessie Cooper",
    phoneOrHandle: "+61-827-680-673",
    avatarUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "braif-fatari",
    name: "Braif Fatari",
    phoneOrHandle: "+61-827-680-673",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "keanu-murphy",
    name: "Keanu Murphy",
    phoneOrHandle: "+61-827-680-673",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "kemal-pahlevi",
    name: "Kemal Pahlevi",
    phoneOrHandle: "+61-827-680-673",
    avatarUrl:
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "kemana-malik",
    name: "Kemana Malik",
    phoneOrHandle: "+61-827-680-673",
    avatarUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
  },
];

export function ContactPickerSheet({
  visible,
  onClose,
  onSelectContact,
}: ContactPickerSheetProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Track keyboard height to adjust scroll padding
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Reset keyboard state & query when sheet closes
  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      setSearchQuery("");
      setIsInputFocused(false);
    }
  }, [visible]);

  // Maintain consistent height matching Mockups 1 & 2 (~88% of screen)
  const screenHeight = Math.max(
    Dimensions.get("screen").height,
    Dimensions.get("window").height
  );
  const sheetHeight = Math.min(
    Math.round(screenHeight * 0.88),
    screenHeight - Math.max(insets.top, 24) - 16
  );

  const { data: apiSearchResults, isLoading: isSearchingApi } =
    useSearchUsers(searchQuery);
  const createDirectMutation = useCreateDirectConversation();

  // Combine backend users with design contacts and group alphabetically
  const sections = useMemo(() => {
    let list: ContactPickerItem[] = [...MOCKUP_CONTACTS];

    // If API returned real users from directory, prepend them
    if (apiSearchResults?.items && apiSearchResults.items.length > 0) {
      const apiUsers: ContactPickerItem[] = apiSearchResults.items.map((u) => ({
        id: u.id,
        name:
          typeof u.displayName === "string" && u.displayName
            ? u.displayName
            : "ChatMe User",
        phoneOrHandle: (u as any).username
          ? `@${(u as any).username}`
          : (u as any).phoneNumber || "Available on Chatme",
        avatarUrl: u.avatarUrl,
      }));

      // Merge avoiding duplicate IDs
      const apiIds = new Set(apiUsers.map((u) => u.id));
      list = [...apiUsers, ...list.filter((c) => !apiIds.has(c.id))];
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phoneOrHandle.toLowerCase().includes(q)
      );
    }

    // Sort alphabetically
    list.sort((a, b) => a.name.localeCompare(b.name));

    // Group into sections by first letter
    const grouped: { [letter: string]: ContactPickerItem[] } = {};
    for (const item of list) {
      const letter = item.name.charAt(0).toUpperCase() || "#";
      if (!grouped[letter]) {
        grouped[letter] = [];
      }
      grouped[letter].push(item);
    }

    return Object.keys(grouped)
      .sort()
      .map((letter) => ({
        title: letter,
        data: grouped[letter],
      }));
  }, [apiSearchResults?.items, searchQuery]);

  const handleSelect = (contact: ContactPickerItem) => {
    if (createDirectMutation.isPending) return;

    if (onSelectContact) {
      onSelectContact(contact);
    }

    // Attempt direct conversation API creation
    createDirectMutation.mutate(
      { participantId: contact.id },
      {
        onSuccess: (newConv: any) => {
          onClose();
          router.push({
            pathname: "/chat/[id]",
            params: {
              id: newConv.id || contact.id,
              name: contact.name,
              avatarUrl: contact.avatarUrl || "",
              status: "Active 5 minutes ago",
            },
          } as any);
        },
        onError: () => {
          // If backend participant ID doesn't exist (e.g. mock user), still allow navigation into the 1-on-1 screen
          onClose();
          router.push({
            pathname: "/chat/[id]",
            params: {
              id: contact.id,
              name: contact.name,
              avatarUrl: contact.avatarUrl || "",
              status: "Active 5 minutes ago",
            },
          } as any);
        },
      }
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
        {/* Top green backdrop background */}
        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
          className="flex-1"
          style={{ backgroundColor: colors.primary, opacity: 0.15 }}
        />

        {/* Modal Sheet Card matching Mockup 1 & 2 with maintained height */}
        <View
          className="w-full rounded-t-[32px] overflow-hidden"
          style={{
            backgroundColor: colors.background,
            height: sheetHeight,
            minHeight: sheetHeight,
          }}
        >
          {/* Drag Handle Bar */}
          <View className="items-center pt-3 pb-2">
            <View
              className="w-12 h-1 rounded-full"
              style={{ backgroundColor: isDark ? "#4B5563" : "#D1D5DB" }}
            />
          </View>

          {/* Title Header */}
          <View className="items-center py-2 px-6">
            <Text
              className="text-[20px] text-center"
              style={{ color: colors.text, fontFamily: "SFPRODISPLAYBOLD" }}
            >
              Contact
            </Text>
          </View>

          {/* Search Bar matching Mockup 1 & 2 with green active highlight */}
          <View className="px-6 pt-2 pb-3">
            <View
              className="flex-row items-center px-4 py-3 rounded-2xl border"
              style={{
                backgroundColor: isDark ? colors.surface : "#F9FAFB",
                borderColor: isInputFocused ? colors.primary : colors.border,
                borderWidth: isInputFocused ? 1.5 : 1,
              }}
            >
              <Ionicons
                name="search"
                size={20}
                color={isInputFocused ? colors.primary : colors.textMuted}
                style={{ marginRight: 10 }}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder="Search people..."
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
          {createDirectMutation.isPending && (
            <View className="py-2 items-center justify-center flex-row">
              <ActivityIndicator size="small" color={colors.primary} />
              <Text
                className="text-[13px] ml-2"
                style={{ color: colors.primary, fontFamily: "SFPRODISPLAYMEDIUM" }}
              >
                Opening conversation...
              </Text>
            </View>
          )}

          {/* Contact SectionList grouped alphabetically */}
          <SectionList
            className="flex-1"
            style={{ flex: 1 }}
            sections={sections}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom, 24) + keyboardHeight,
            }}
            renderSectionHeader={({ section: { title } }) => (
              <View
                className="px-6 py-1.5"
                style={{
                  backgroundColor: isDark ? colors.surface : "#F3F4F6",
                }}
              >
                <Text
                  className="text-[13px] uppercase tracking-wider"
                  style={{
                    color: isDark ? colors.textMuted : "#6B7280",
                    fontFamily: "SFPRODISPLAYBOLD",
                  }}
                >
                  {title}
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item)}
                disabled={createDirectMutation.isPending}
                className="flex-row items-center px-6 py-3 active:opacity-70"
              >
                {/* Circular Avatar */}
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
                      style={{
                        color: colors.primaryDark,
                        fontFamily: "SFPRODISPLAYBOLD",
                      }}
                    >
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>

                {/* Name & Phone Number */}
                <View className="flex-1 mr-2">
                  <Text
                    className="text-[16px]"
                    style={{ color: colors.text, fontFamily: "SFPRODISPLAYBOLD" }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    className="text-[13px] mt-0.5"
                    style={{
                      color: colors.textSecondary,
                      fontFamily: "SFPRODISPLAYREGULAR",
                    }}
                    numberOfLines={1}
                  >
                    {item.phoneOrHandle}
                  </Text>
                </View>

                {/* Right Chevron > matching mockup */}
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isDark ? "#9CA3AF" : "#CBD5E1"}
                />
              </Pressable>
            )}
            ListEmptyComponent={() => (
              <View className="items-center justify-center py-16 px-6">
                <Ionicons
                  name="search-outline"
                  size={44}
                  color={colors.textMuted}
                  style={{ marginBottom: 10 }}
                />
                <Text
                  className="text-[16px] text-center"
                  style={{ color: colors.text, fontFamily: "SFPRODISPLAYBOLD" }}
                >
                  No contacts found
                </Text>
                <Text
                  className="text-[13px] text-center mt-1"
                  style={{
                    color: colors.textSecondary,
                    fontFamily: "SFPRODISPLAYREGULAR",
                  }}
                >
                  Try searching for another name or phone number
                </Text>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

export default ContactPickerSheet;

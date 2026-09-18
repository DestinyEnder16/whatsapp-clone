// src/features/settings/screens/StarMessageScreen.tsx
import { useAppTheme } from "@/shared/hooks";
import { toast } from "@/shared/utils/toast";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface StarredMessageItem {
  id: string;
  text: string;
  time: string;
  senderName: string;
  senderAvatar: string;
  date: string;
  conversationId?: string;
}

export const SAMPLE_STARRED_MESSAGES: StarredMessageItem[] = [
  {
    id: "star-1",
    text: "Orci maecenas hendrerit mattis consectetur. Mauris.",
    time: "15:46",
    senderName: "Bianne Russell",
    senderAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    date: "21/07/2021",
  },
  {
    id: "star-2",
    text: "Orci maecenas hendrerit mattis consectetur. Mauris.",
    time: "19:40",
    senderName: "Annie Miles",
    senderAvatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    date: "22/07/2021",
  },
  {
    id: "star-3",
    text: "Egestas interdum orci commodo faucibus pretium, neque etiam",
    time: "18:23",
    senderName: "Bessie Cooper",
    senderAvatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    date: "21/07/2021",
  },
  {
    id: "star-4",
    text: "Orci maecenas hendrerit mattis consectetur. Mauris.",
    time: "19:40",
    senderName: "Annie Miles",
    senderAvatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    date: "22/07/2021",
  },
];

export function StarMessageScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const [messages, setMessages] = useState<StarredMessageItem[]>(SAMPLE_STARRED_MESSAGES);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.text.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q),
    );
  }, [messages, searchQuery]);

  function handleMessagePress(item: StarredMessageItem) {
    Alert.alert(
      item.senderName,
      `"${item.text}"\n\nSent on ${item.date} at ${item.time}`,
      [
        {
          text: "Unstar Message",
          style: "destructive",
          onPress: () => {
            setMessages((prev) => prev.filter((m) => m.id !== item.id));
            toast.info("Message Unstarred", "Removed from starred messages.");
          },
        },
        { text: "Close", style: "cancel" },
      ],
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />

      {/* Top Header */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingTop: insets.top,
        }}
        className="w-full pb-3 px-5 shadow-sm"
      >
        <View className="h-12 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="w-10 h-10 items-center justify-center -ml-2 active:opacity-75"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </Pressable>

          <Text className="text-[19px] font-bold text-white tracking-tight text-center">
            Star Message
          </Text>

          <Pressable
            onPress={() => {
              setIsSearching(!isSearching);
              if (isSearching) setSearchQuery("");
            }}
            accessibilityRole="button"
            accessibilityLabel="Search starred messages"
            className="w-10 h-10 items-center justify-center -mr-2 active:opacity-75"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isSearching ? "close" : "search-outline"}
              size={22}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        {/* Search Input Bar (Toggled) */}
        {isSearching && (
          <View className="mt-2 mb-1 px-3 py-1.5 bg-white/20 rounded-xl flex-row items-center">
            <Ionicons name="search" size={16} color="#FFFFFF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search starred messages..."
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              autoFocus
              className="flex-1 ml-2 text-white text-[15px] py-1 font-medium"
            />
          </View>
        )}
      </View>

      {/* Starred Messages List */}
      <FlatList
        data={filteredMessages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="py-20 items-center justify-center">
            <Ionicons name="star-outline" size={48} color="#94A3B8" />
            <Text className="text-[16px] font-semibold text-neutral-400 mt-4 text-center">
              No starred messages found
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleMessagePress(item)}
            className="mb-6 active:opacity-90"
          >
            {/* Message Bubble Row with Time on Right */}
            <View className="flex-row items-center">
              {/* Bubble */}
              <View
                className="flex-1 rounded-[18px] p-4 relative border border-[#D9EFE2]"
                style={styles.bubbleBg}
              >
                <Text className="text-[14.5px] text-[#1F2937] leading-5 pr-5 font-normal">
                  {item.text}
                </Text>

                {/* Star Icon in Bubble */}
                <View className="absolute bottom-2.5 right-3">
                  <Ionicons name="star" size={13} color="#E8A13A" />
                </View>
              </View>

              {/* Timestamp outside bubble */}
              <View className="w-14 items-end pl-2">
                <Text className="text-[12.5px] font-medium text-neutral-400">
                  {item.time}
                </Text>
              </View>
            </View>

            {/* Sender and Date Row */}
            <View className="flex-row items-center justify-between mt-2.5 px-1">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-7 h-7 rounded-full overflow-hidden bg-neutral-200">
                  <Image
                    source={{ uri: item.senderAvatar }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                </View>
                <Text
                  className="ml-2.5 text-[14px] font-semibold text-neutral-900"
                  numberOfLines={1}
                >
                  {item.senderName}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Text className="text-[12.5px] font-medium text-neutral-400">
                  {item.date}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color="#94A3B8"
                  style={{ marginLeft: 2 }}
                />
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleBg: {
    backgroundColor: "#F0F9F4",
  },
});

export default StarMessageScreen;

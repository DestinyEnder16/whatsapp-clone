import colors from "@/shared/theme/colors";
import Ionicons from "@react-native-vector-icons/ionicons";
import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ChatItem {
  id: string;
  name: string;
  message: string;
  time: string;
  unreadCount: number;
  avatarBg: string;
  online: boolean;
  pinned?: boolean;
}

const SAMPLE_CHATS: ChatItem[] = [
  {
    id: "1",
    name: "Alex Johnson",
    message: "Hey! Did you test the latest update? Looks awesome! 🔥",
    time: "10:42 AM",
    unreadCount: 2,
    avatarBg: "#57B77D",
    online: true,
    pinned: true,
  },
  {
    id: "2",
    name: "Sarah Connor",
    message: "See you at the coffee shop tomorrow! ☕",
    time: "09:15 AM",
    unreadCount: 0,
    avatarBg: "#007CFF",
    online: true,
    pinned: true,
  },
  {
    id: "3",
    name: "Mobile Dev Team",
    message: "Great: Let's sync on the Expo SDK 57 build today.",
    time: "Yesterday",
    unreadCount: 5,
    avatarBg: "#73C393",
    online: false,
  },
  {
    id: "4",
    name: "David Kim",
    message: "Can you send over the API schema when free?",
    time: "Yesterday",
    unreadCount: 0,
    avatarBg: "#FFB23F",
    online: false,
  },
  {
    id: "5",
    name: "Emily Watson",
    message: "Thanks so much for the quick help earlier! 🙏",
    time: "Monday",
    unreadCount: 0,
    avatarBg: "#FA6B52",
    online: false,
  },
  {
    id: "6",
    name: "Michael Brown",
    message: "Let me know when you arrive at the office.",
    time: "Sunday",
    unreadCount: 1,
    avatarBg: "#3A7A53",
    online: false,
  },
  {
    id: "7",
    name: "Product Design",
    message: "Figma link has been updated with the new photo flow.",
    time: "10/18",
    unreadCount: 0,
    avatarBg: "#8EA3B3",
    online: false,
  },
];

export default function ChatsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "groups">("all");

  const filteredChats = SAMPLE_CHATS.filter((chat) => {
    const matchesSearch =
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.message.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === "unread") return chat.unreadCount > 0;
    if (activeFilter === "groups") return chat.name.includes("Team") || chat.name.includes("Design");
    return true;
  });

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-2 pb-3 flex-row items-center justify-between">
        <Text className="text-[26px] font-bold text-neutral-900 tracking-tight">
          Chats
        </Text>
        <View className="flex-row items-center gap-x-4">
          <Pressable className="w-10 h-10 rounded-full bg-neutral-50 items-center justify-center active:bg-neutral-100">
            <Ionicons name="camera-outline" size={22} color={colors.neutral[800]} />
          </Pressable>
          <Pressable className="w-10 h-10 rounded-full bg-neutral-50 items-center justify-center active:bg-neutral-100">
            <Ionicons name="ellipsis-vertical" size={20} color={colors.neutral[800]} />
          </Pressable>
        </View>
      </View>

      {/* Search Input */}
      <View className="px-5 mb-3">
        <View className="flex-row items-center bg-neutral-50 rounded-2xl px-3.5 h-11 border border-neutral-100">
          <Ionicons name="search-outline" size={18} color={colors.neutral[300]} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search or start new chat"
            placeholderTextColor={colors.neutral[200]}
            className="flex-1 ml-2.5 text-[15px] text-neutral-900 font-medium"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.neutral[200]} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="px-5 mb-2 flex-row gap-x-2">
        <Pressable
          onPress={() => setActiveFilter("all")}
          className={`px-3.5 py-1.5 rounded-full border ${
            activeFilter === "all"
              ? "bg-primary-50 border-primary-200"
              : "bg-white border-neutral-100"
          }`}
        >
          <Text
            className={`text-[13px] font-semibold ${
              activeFilter === "all" ? "text-primary-600" : "text-neutral-400"
            }`}
          >
            All
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveFilter("unread")}
          className={`px-3.5 py-1.5 rounded-full border ${
            activeFilter === "unread"
              ? "bg-primary-50 border-primary-200"
              : "bg-white border-neutral-100"
          }`}
        >
          <Text
            className={`text-[13px] font-semibold ${
              activeFilter === "unread" ? "text-primary-600" : "text-neutral-400"
            }`}
          >
            Unread
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveFilter("groups")}
          className={`px-3.5 py-1.5 rounded-full border ${
            activeFilter === "groups"
              ? "bg-primary-50 border-primary-200"
              : "bg-white border-neutral-100"
          }`}
        >
          <Text
            className={`text-[13px] font-semibold ${
              activeFilter === "groups" ? "text-primary-600" : "text-neutral-400"
            }`}
          >
            Groups
          </Text>
        </Pressable>
      </View>

      {/* Chat List */}
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        ItemSeparatorComponent={() => (
          <View className="ml-20 mr-5 h-[1px] bg-neutral-50" />
        )}
        renderItem={({ item }) => (
          <Pressable className="px-5 py-3.5 flex-row items-center active:bg-neutral-50/70">
            {/* Avatar */}
            <View className="relative">
              <View
                className="w-13 h-13 rounded-full items-center justify-center"
                style={{ backgroundColor: item.avatarBg }}
              >
                <Text className="text-white text-[17px] font-bold">
                  {item.name.charAt(0)}
                </Text>
              </View>
              {item.online && (
                <View className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-primary-400 border-2 border-white" />
              )}
            </View>

            {/* Chat Content */}
            <View className="flex-1 ml-3.5">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[16px] font-bold text-neutral-900" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text
                  className={`text-[12px] ${
                    item.unreadCount > 0 ? "text-primary-500 font-semibold" : "text-neutral-300"
                  }`}
                >
                  {item.time}
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
                <Text
                  className={`text-[14px] flex-1 mr-2 ${
                    item.unreadCount > 0
                      ? "text-neutral-900 font-medium"
                      : "text-neutral-300"
                  }`}
                  numberOfLines={1}
                >
                  {item.message}
                </Text>

                {item.unreadCount > 0 && (
                  <View className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary-400 items-center justify-center">
                    <Text className="text-white text-[11px] font-bold">
                      {item.unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        )}
      />

      {/* Floating Action Button */}
      <Pressable
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg active:opacity-90"
        style={{ backgroundColor: colors.primary[400] }}
      >
        <Ionicons name="chatbubble-ellipses" size={26} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

import colors from "@/shared/theme/colors";
import Ionicons from "@react-native-vector-icons/ionicons";
import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface CallItem {
  id: string;
  name: string;
  type: "incoming" | "outgoing" | "missed";
  isVideo: boolean;
  time: string;
  avatarBg: string;
}

const SAMPLE_CALLS: CallItem[] = [
  {
    id: "1",
    name: "Sarah Connor",
    type: "incoming",
    isVideo: true,
    time: "Today, 11:20 AM",
    avatarBg: "#007CFF",
  },
  {
    id: "2",
    name: "Alex Johnson",
    type: "missed",
    isVideo: false,
    time: "Today, 08:45 AM",
    avatarBg: "#57B77D",
  },
  {
    id: "3",
    name: "Emily Watson",
    type: "outgoing",
    isVideo: false,
    time: "Yesterday, 4:12 PM",
    avatarBg: "#FA6B52",
  },
  {
    id: "4",
    name: "David Kim",
    type: "missed",
    isVideo: true,
    time: "October 24, 2:30 PM",
    avatarBg: "#FFB23F",
  },
  {
    id: "5",
    name: "Michael Brown",
    type: "incoming",
    isVideo: false,
    time: "October 22, 6:15 PM",
    avatarBg: "#3A7A53",
  },
  {
    id: "6",
    name: "Design Lead",
    type: "outgoing",
    isVideo: true,
    time: "October 20, 10:00 AM",
    avatarBg: "#8EA3B3",
  },
];

export default function CallsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-2 pb-3 flex-row items-center justify-between">
        <Text className="text-[26px] font-bold text-neutral-900 tracking-tight">
          Calls
        </Text>
        <View className="flex-row items-center gap-x-4">
          <Pressable className="w-10 h-10 rounded-full bg-neutral-50 items-center justify-center active:bg-neutral-100">
            <Ionicons name="search-outline" size={20} color={colors.neutral[800]} />
          </Pressable>
          <Pressable className="w-10 h-10 rounded-full bg-neutral-50 items-center justify-center active:bg-neutral-100">
            <Ionicons name="call-outline" size={20} color={colors.neutral[800]} />
          </Pressable>
        </View>
      </View>

      {/* Call Link Banner */}
      <Pressable className="mx-5 mb-4 p-3.5 rounded-2xl bg-primary-50/60 border border-primary-100 flex-row items-center active:bg-primary-50">
        <View className="w-11 h-11 rounded-full bg-primary-400 items-center justify-center">
          <Ionicons name="link-outline" size={22} color="#FFFFFF" />
        </View>
        <View className="ml-3.5 flex-1">
          <Text className="text-[15px] font-bold text-neutral-900">
            Create call link
          </Text>
          <Text className="text-[13px] text-neutral-300 font-medium">
            Share a link for your WhatsApp call
          </Text>
        </View>
      </Pressable>

      {/* Section Header */}
      <View className="px-5 mb-2">
        <Text className="text-[15px] font-bold text-neutral-800">
          Recent
        </Text>
      </View>

      {/* Calls List */}
      <FlatList
        data={SAMPLE_CALLS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        ItemSeparatorComponent={() => (
          <View className="ml-20 mr-5 h-[1px] bg-neutral-50" />
        )}
        renderItem={({ item }) => (
          <Pressable className="px-5 py-3.5 flex-row items-center active:bg-neutral-50/70">
            {/* Avatar */}
            <View
              className="w-13 h-13 rounded-full items-center justify-center"
              style={{ backgroundColor: item.avatarBg }}
            >
              <Text className="text-white text-[17px] font-bold">
                {item.name.charAt(0)}
              </Text>
            </View>

            {/* Call Details */}
            <View className="flex-1 ml-3.5">
              <Text
                className={`text-[16px] font-bold ${
                  item.type === "missed" ? "text-red-500" : "text-neutral-900"
                }`}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <View className="flex-row items-center mt-1">
                <Ionicons
                  name={
                    item.type === "outgoing"
                      ? "arrow-up"
                      : item.type === "missed"
                      ? "arrow-down"
                      : "arrow-down"
                  }
                  size={14}
                  color={item.type === "missed" ? "#DD524C" : colors.primary[400]}
                />
                <Text className="ml-1 text-[13px] text-neutral-300 font-medium">
                  {item.time}
                </Text>
              </View>
            </View>

            {/* Action Icon */}
            <Pressable className="w-10 h-10 rounded-full items-center justify-center active:bg-neutral-50">
              <Ionicons
                name={item.isVideo ? "videocam-outline" : "call-outline"}
                size={22}
                color={colors.primary[400]}
              />
            </Pressable>
          </Pressable>
        )}
      />

      {/* Floating Call Button */}
      <Pressable
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg active:opacity-90"
        style={{ backgroundColor: colors.primary[400] }}
      >
        <Ionicons name="call" size={24} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

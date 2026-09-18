// src/features/settings/screens/LastCallScreen.tsx
import { useAppTheme } from "@/shared/hooks";
import { toast } from "@/shared/utils/toast";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type CallDirection = "incoming" | "outgoing" | "missed";

export interface CallRecordItem {
  id: string;
  contactName: string;
  phoneNumber: string;
  avatarUrl: string;
  direction: CallDirection;
  time: string;
  duration?: string;
}

export interface CallSection {
  title: string;
  data: CallRecordItem[];
}

export const SAMPLE_CALL_SECTIONS: CallSection[] = [
  {
    title: "TODAY",
    data: [
      {
        id: "call-1",
        contactName: "Annie Miles",
        phoneNumber: "+61-827-680-673",
        avatarUrl:
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
        direction: "incoming",
        time: "10:30 PM",
        duration: "5 mins 12 secs",
      },
      {
        id: "call-2",
        contactName: "Wade Warren",
        phoneNumber: "+61-827-680-674",
        avatarUrl:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        direction: "outgoing",
        time: "10:00 PM",
        duration: "12 mins 44 secs",
      },
      {
        id: "call-3",
        contactName: "Guy Hawkins",
        phoneNumber: "+61-827-680-675",
        avatarUrl:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        direction: "missed",
        time: "08:32 PM",
        duration: "Unanswered",
      },
    ],
  },
  {
    title: "YESTERDAY",
    data: [
      {
        id: "call-4",
        contactName: "Robert Fox",
        phoneNumber: "+61-827-680-676",
        avatarUrl:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
        direction: "outgoing",
        time: "11:11 PM",
        duration: "3 mins 05 secs",
      },
      {
        id: "call-5",
        contactName: "Savannah Nguyen",
        phoneNumber: "+61-827-680-677",
        avatarUrl:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
        direction: "incoming",
        time: "10:22 PM",
        duration: "18 mins 20 secs",
      },
      {
        id: "call-6",
        contactName: "Albet Flores",
        phoneNumber: "+61-827-680-678",
        avatarUrl:
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        direction: "outgoing",
        time: "10:10 PM",
        duration: "1 min 15 secs",
      },
      {
        id: "call-7",
        contactName: "Annette Black",
        phoneNumber: "+61-827-680-679",
        avatarUrl:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        direction: "incoming",
        time: "09:31 PM",
        duration: "8 mins 50 secs",
      },
      {
        id: "call-8",
        contactName: "Floyd Miles",
        phoneNumber: "+61-827-680-680",
        avatarUrl:
          "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
        direction: "outgoing",
        time: "09:00 PM",
        duration: "4 mins 32 secs",
      },
      {
        id: "call-9",
        contactName: "Kathryn Murphy",
        phoneNumber: "+61-827-680-681",
        avatarUrl:
          "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        direction: "incoming",
        time: "08:21 PM",
        duration: "14 mins 02 secs",
      },
    ],
  },
];

export function LastCallScreen({
  showBackButton = true,
  title = "Last Call",
}: {
  showBackButton?: boolean;
  title?: string;
} = {}) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const [sections] = useState<CallSection[]>(SAMPLE_CALL_SECTIONS);

  function handleStartCall(item: CallRecordItem) {
    Alert.alert(
      "Start Voice Call",
      `Call ${item.contactName} at ${item.phoneNumber}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Call",
          onPress: () => {
            toast.success("Calling...", `Connecting to ${item.contactName}`);
          },
        },
      ],
    );
  }

  function handleCallInfo(item: CallRecordItem) {
    const directionLabel =
      item.direction === "missed"
        ? "Missed Call"
        : item.direction === "incoming"
          ? "Incoming Call"
          : "Outgoing Call";

    Alert.alert(
      item.contactName,
      `Type: ${directionLabel}\nTime: ${item.time}\nDuration: ${item.duration || "N/A"}\nNumber: ${item.phoneNumber}`,
      [
        {
          text: "Call Back",
          onPress: () => handleStartCall(item),
        },
        { text: "Done", style: "cancel" },
      ],
    );
  }

  function handleNewCall() {
    Alert.alert(
      "New Call",
      "Select a contact to place a new voice or video call.",
      [
        {
          text: "Open Contacts",
          onPress: () => router.push("/(tabs)" as any),
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style="light" />

      {/* Top Header Bar */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingTop: insets.top,
        }}
        className="w-full pb-3 px-5 shadow-sm"
      >
        <View className="h-12 flex-row items-center justify-between">
          {showBackButton ? (
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="w-10 h-10 items-center justify-center -ml-2 active:opacity-75"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
            </Pressable>
          ) : (
            <View className="w-10" />
          )}

          <Text
            className="text-[19px] text-white tracking-tight text-center"
            style={{ fontFamily: "SFPRODISPLAYBOLD" }}
          >
            {title}
          </Text>

          <Pressable
            onPress={handleNewCall}
            accessibilityRole="button"
            accessibilityLabel="New Call"
            className="w-10 h-10 items-center justify-center -mr-2 active:opacity-75"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Grouped Call History List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 20,
        }}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section: { title: sectionTitle } }) => (
          <View
            className="px-5 pt-4 pb-2"
            style={{ backgroundColor: colors.background }}
          >
            <Text
              className="text-[12px] tracking-wider uppercase"
              style={{
                color: colors.textMuted,
                fontFamily: "SFPRODISPLAYBOLD",
              }}
            >
              {sectionTitle}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isMissed = item.direction === "missed";
          const isOutgoing = item.direction === "outgoing";

          return (
            <Pressable
              onPress={() => handleStartCall(item)}
              className="px-5 py-3 flex-row items-center justify-between active:opacity-70"
              style={{ backgroundColor: colors.background }}
            >
              {/* Left Column: Avatar & Contact Info */}
              <View className="flex-row items-center flex-1 mr-3">
                <View
                  className="w-[50px] h-[50px] rounded-full overflow-hidden border"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  }}
                >
                  <Image
                    source={{ uri: item.avatarUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                </View>

                <View className="ml-3.5 flex-1">
                  <Text
                    className="text-[16px]"
                    style={{
                      color: colors.text,
                      fontFamily: "SFPRODISPLAYBOLD",
                    }}
                    numberOfLines={1}
                  >
                    {item.contactName}
                  </Text>

                  {/* Direction icon & label */}
                  <View className="flex-row items-center mt-1">
                    <Ionicons
                      name={
                        isMissed
                          ? "call"
                          : isOutgoing
                            ? "arrow-up"
                            : "arrow-down"
                      }
                      size={13}
                      color={isMissed ? "#DD524C" : isDark ? colors.textMuted : "#6E8597"}
                    />
                    <Text
                      className="ml-1.5 text-[13px]"
                      style={{
                        color: isMissed ? "#DD524C" : isDark ? colors.textMuted : "#6E8597",
                        fontFamily: "SFPRODISPLAYMEDIUM",
                      }}
                    >
                      {isMissed
                        ? "Missed Call"
                        : isOutgoing
                          ? "Outgoing"
                          : "Incoming"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Right Column: Time & Info Icon */}
              <View className="flex-row items-center">
                <Text
                  className="text-[13px] mr-2.5"
                  style={{
                    color: colors.textMuted,
                    fontFamily: "SFPRODISPLAYREGULAR",
                  }}
                >
                  {item.time}
                </Text>

                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleCallInfo(item);
                  }}
                  accessibilityLabel="Call info"
                  className="p-1 active:opacity-70"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={22}
                    color={colors.primary}
                  />
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

export default LastCallScreen;

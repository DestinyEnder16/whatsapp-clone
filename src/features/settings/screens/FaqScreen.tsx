// src/features/settings/screens/FaqScreen.tsx
import { ScreenHeader } from "@/shared/components";
import { useAppTheme } from "@/shared/hooks";
import Ionicons from "@react-native-vector-icons/ionicons";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { FaqAccordionItem } from "../components";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FaqItem[] = [
  {
    id: "faq-1",
    question: "How can i use this app?",
    answer:
      'You can download it in the play store/app store, then type in the search menu with the name "ChatMe" then press download to be able to communicate easily.',
  },
  {
    id: "faq-2",
    question: "Is this app paid?",
    answer:
      "No, ChatMe is completely free to download and use. Standard mobile data rates may apply depending on your cellular service provider.",
  },
  {
    id: "faq-3",
    question: "How to send messages and videos?",
    answer:
      "Select a contact from your chat list or tap the compose icon. Enter your message in the text field or tap the attachment/camera icon to attach photos and videos.",
  },
  {
    id: "faq-4",
    question: "Are there any special requirements for using this application?",
    answer:
      "All you need is a valid mobile phone number capable of receiving SMS verification codes and an active Wi-Fi or cellular data connection.",
  },
  {
    id: "faq-5",
    question: "How to send files?",
    answer:
      "Inside any conversation, tap the attachment '+' button next to the chat bar, select 'Document', choose your desired file, and press send.",
  },
];

export function FaqScreen() {
  const { colors } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState("");
  // Default first item expanded matching the screenshot
  const [expandedId, setExpandedId] = useState<string | null>("faq-1");

  const toggleItem = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return FAQ_DATA;
    return FAQ_DATA.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style="light" />

      {/* Screen Header */}
      <ScreenHeader title="FAQ" />

      {/* Sub-header with Green Background containing Search Bar matching Figma */}
      <View
        className="px-5 pt-1 pb-4"
        style={{ backgroundColor: colors.primary }}
      >
        <View
          className="flex-row items-center px-3.5 py-2 rounded-xl"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.22)",
          }}
        >
          <Ionicons name="search" size={18} color="rgba(255, 255, 255, 0.85)" />
          <TextInput
            placeholder="Search questions ..."
            placeholderTextColor="rgba(255, 255, 255, 0.75)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2.5 text-[15px] p-0 font-medium text-white"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Ionicons
              name="close-circle"
              size={18}
              color="rgba(255, 255, 255, 0.85)"
              onPress={() => setSearchQuery("")}
            />
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="mt-2">
          {filteredFaqs.map((item) => (
            <FaqAccordionItem
              key={item.id}
              question={item.question}
              answer={item.answer}
              isExpanded={expandedId === item.id}
              onToggle={() => toggleItem(item.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default FaqScreen;

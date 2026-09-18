// src/features/chat/screens/ChatRoomScreen.tsx
import { useAppTheme } from "@/shared/hooks";
import { toast } from "@/shared/utils/toast";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatAttachmentMenu } from "../components/ChatAttachmentMenu";

interface MessageItem {
  id: string;
  text: string;
  isSender: boolean;
  time: string;
  imageUri?: string;
}

// Initial messages matching Mockup 3
const INITIAL_MESSAGES: MessageItem[] = [
  {
    id: "msg-1",
    text: "Habitant elit pellentesque curabitur morbi sit fusce elit",
    isSender: false,
    time: "18:25",
  },
  {
    id: "msg-2",
    text: "Gravida lectus semper orci",
    isSender: true,
    time: "19:40",
  },
  {
    id: "msg-3",
    text: "Egestas interdum orci commodo faucibus pretium, neque etiam",
    isSender: false,
    time: "19:40",
  },
  {
    id: "msg-4",
    text: "Orci maecenas hendrerit mattis consectetur. Mauris.",
    isSender: false,
    time: "19:40",
  },
];

export function ChatRoomScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    avatarUrl?: string;
    status?: string;
  }>();

  const contactName = params.name || "Keanu Murphy";
  const contactAvatar = params.avatarUrl || "";
  const contactStatus = params.status || "Active 5 minutes ago";

  const [messages, setMessages] = useState<MessageItem[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");

    const newMessage: MessageItem = {
      id: `msg-${Date.now()}`,
      text: inputText.trim(),
      isSender: true,
      time: `${hours}:${minutes}`,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendPhoto = (uri: string) => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");

    const newMessage: MessageItem = {
      id: `photo-${Date.now()}`,
      text: "",
      imageUri: uri,
      isSender: true,
      time: `${hours}:${minutes}`,
    };

    setMessages((prev) => [...prev, newMessage]);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: isDark ? colors.background : "#F4F7F9" }}>
      <StatusBar style="light" />

      {/* Top Green Header matching Mockup 3 */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingTop: insets.top + 6,
          paddingBottom: 14,
          paddingHorizontal: 16,
        }}
        className="flex-row items-center justify-between"
      >
        {/* Left: Back Button + Contact Info */}
        <View className="flex-row items-center flex-1 mr-2">
          {/* Back Chevron */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="w-9 h-9 items-center justify-center mr-1 active:opacity-75"
          >
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </Pressable>

          {/* Contact Avatar */}
          <View className="w-10 h-10 rounded-full overflow-hidden items-center justify-center mr-3 border border-white/30 bg-white/20">
            {contactAvatar ? (
              <Image
                source={{ uri: contactAvatar }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <Text
                className="text-white text-[16px]"
                style={{ fontFamily: "SFPRODISPLAYBOLD" }}
              >
                {contactName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          {/* Name & Active Status */}
          <View className="flex-1">
            <Text
              className="text-white text-[17px]"
              style={{ fontFamily: "SFPRODISPLAYBOLD" }}
              numberOfLines={1}
            >
              {contactName}
            </Text>
            <Text
              className="text-white/80 text-[12px] mt-0.5"
              style={{ fontFamily: "SFPRODISPLAYREGULAR" }}
              numberOfLines={1}
            >
              {contactStatus}
            </Text>
          </View>
        </View>

        {/* Right: Video & Call Icons matching Mockup 3 */}
        <View className="flex-row items-center space-x-3">
          <Pressable
            onPress={() => toast.info("Video Call", `Starting video call with ${contactName}`)}
            hitSlop={8}
            className="w-9 h-9 items-center justify-center active:opacity-75"
          >
            <Ionicons name="videocam" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={() => toast.info("Voice Call", `Starting call with ${contactName}`)}
            hitSlop={8}
            className="w-9 h-9 items-center justify-center active:opacity-75 ml-1"
          >
            <Ionicons name="call" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Messages List Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 16,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isMe = item.isSender;

            return (
              <View
                className={`my-1.5 flex-row ${
                  isMe ? "justify-end" : "justify-start"
                }`}
              >
                <View
                  className={`max-w-[78%] px-4 py-2.5 rounded-2xl shadow-sm ${
                    isMe
                      ? "rounded-tr-sm"
                      : "rounded-tl-sm"
                  }`}
                  style={{
                    backgroundColor: isMe
                      ? colors.primary
                      : isDark
                      ? colors.surface
                      : "#FFFFFF",
                  }}
                >
                  {/* Photo Attachment preview if any */}
                  {item.imageUri && (
                    <View className="w-56 h-48 rounded-xl overflow-hidden mb-2">
                      <Image
                        source={{ uri: item.imageUri }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                    </View>
                  )}

                  {/* Message Text */}
                  {Boolean(item.text) && (
                    <Text
                      className="text-[15px] leading-5 mb-1"
                      style={{
                        color: isMe ? "#FFFFFF" : colors.text,
                        fontFamily: "SFPRODISPLAYREGULAR",
                      }}
                    >
                      {item.text}
                    </Text>
                  )}

                  {/* Timestamp in bottom right */}
                  <View className="items-end">
                    <Text
                      className="text-[11px]"
                      style={{
                        color: isMe ? "rgba(255,255,255,0.75)" : colors.textMuted,
                        fontFamily: "SFPRODISPLAYREGULAR",
                      }}
                    >
                      {item.time}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />

        {/* Bottom Message Input Bar matching Mockups 3 & 4 */}
        <View
          className="flex-row items-center px-4 py-3 border-t"
          style={{
            backgroundColor: isDark ? colors.surface : "#FFFFFF",
            borderColor: colors.divider,
            paddingBottom: Math.max(insets.bottom, 12),
          }}
        >
          {/* Paperclip Button */}
          <Pressable
            onPress={() => setShowAttachmentMenu(true)}
            hitSlop={8}
            className="w-10 h-10 items-center justify-center mr-1 active:opacity-75"
          >
            <Ionicons name="attach" size={24} color={colors.textMuted} />
          </Pressable>

          {/* Text Input Pill */}
          <View
            className="flex-1 flex-row items-center px-4 py-2.5 rounded-full mr-2 border"
            style={{
              backgroundColor: isDark ? colors.background : "#F9FAFB",
              borderColor: colors.border,
            }}
          >
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              className="flex-1 text-[15px] max-h-24"
              style={{ color: colors.text, fontFamily: "SFPRODISPLAYREGULAR" }}
              multiline
            />
          </View>

          {/* Circular Green Send Button matching Mockup 3 */}
          <Pressable
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
            className="w-11 h-11 rounded-full items-center justify-center active:opacity-85 shadow"
            style={{
              backgroundColor: colors.primary,
              opacity: inputText.trim() ? 1 : 0.8,
            }}
          >
            <Ionicons name="send" size={19} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Paperclip Attachment Menu matching Mockup 4 */}
      <ChatAttachmentMenu
        visible={showAttachmentMenu}
        onClose={() => setShowAttachmentMenu(false)}
        onSelectPhoto={handleSendPhoto}
      />
    </View>
  );
}

export default ChatRoomScreen;

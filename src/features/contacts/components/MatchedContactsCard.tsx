import React from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { MatchedContactItem } from "../hooks/useSyncContacts";

interface MatchedContactsCardProps {
  /** Matched contacts discovered from the backend */
  matches: MatchedContactItem[];
  /** Tap action to begin messaging or open the full contacts modal */
  onPressAction?: () => void;
  /** Application display brand name (defaults to "Chatme") */
  appName?: string;
}

// Fallback diverse avatar illustrations if a matched user hasn't set an avatarUrl yet
const FALLBACK_AVATARS = [
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
];

/**
 * MatchedContactsCard
 *
 * Renders an inviting social preview when contacts are found:
 * 1. Stacked, overlapping avatar row (like WhatsApp / Instagram social proof bubbles).
 * 2. "+N" overflow badge if more than 4 contacts matched.
 * 3. Personalized description combining the first 3 friend names (preferring local phonebook names).
 */
export function MatchedContactsCard({
  matches,
  onPressAction,
  appName = "Chatme",
}: MatchedContactsCardProps) {
  const displayAvatars = matches.slice(0, 4);
  const remainingCount = matches.length > 4 ? matches.length - 4 : 0;

  // Extract up to the first 3 contact names
  const names = matches
    .slice(0, 3)
    .map((m) => m.localName || (typeof m.user?.displayName === "string" ? m.user.displayName : "") || "Friend")
    .filter(Boolean);

  const formattedNames = names.join(", ");
  const extraText =
    remainingCount > 0
      ? ` and ${remainingCount}+ contact${remainingCount > 1 ? "s" : ""} found on ${appName}`
      : ` found on ${appName}`;

  return (
    <Pressable
      onPress={onPressAction}
      className="items-center justify-center px-6 py-8"
    >
      {/* Overlapping Avatars Row */}
      <View className="flex-row items-center justify-center mb-6">
        {displayAvatars.map((contact, index) => {
          const avatarUri =
            contact.user?.avatarUrl || FALLBACK_AVATARS[index % FALLBACK_AVATARS.length];

          return (
            <View
              key={contact.matchedPhoneNumber || index}
              className={`w-14 h-14 rounded-full border-[3px] border-white shadow-sm overflow-hidden bg-neutral-200 ${
                index > 0 ? "-ml-3.5" : ""
              }`}
              style={{ zIndex: 10 - index }}
            >
              <Image
                source={{ uri: avatarUri }}
                className="w-full h-full"
                contentFit="cover"
                transition={200}
              />
            </View>
          );
        })}

        {/* 5th circle badge showing +N or 26+ */}
        {remainingCount > 0 && (
          <View
            className="w-14 h-14 rounded-full border-[3px] border-white bg-[#E8EDF2] items-center justify-center -ml-3.5 shadow-sm"
            style={{ zIndex: 5 }}
          >
            <Text className="text-[#334155] font-bold text-sm">
              {remainingCount}+
            </Text>
          </View>
        )}
      </View>

      {/* Description Text */}
      <Text className="text-center text-[15px] leading-6 text-neutral-500 max-w-[320px]">
        {names.length > 0 ? (
          <Text className="font-semibold text-neutral-900">
            {formattedNames}
          </Text>
        ) : (
          <Text className="font-semibold text-neutral-900">Your contacts</Text>
        )}
        {extraText}, try sending a message to them or just saying hello.
      </Text>
    </Pressable>
  );
}

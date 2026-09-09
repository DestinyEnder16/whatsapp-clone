import React from "react";
import { View } from "react-native";
import Button from "@/shared/components/Button";
import { MatchedContactsCard } from "./MatchedContactsCard";
import { useContactsSyncContext } from "../context/ContactsSyncContext";
import { MatchedContactItem } from "../hooks/useSyncContacts";

export interface ContactsMatchedStateProps {
  matches?: MatchedContactItem[];
  onStartChat?: () => void;
}

export function ContactsMatchedState({
  matches: propMatches,
  onStartChat: propOnStartChat,
}: ContactsMatchedStateProps = {}) {
  const context = useContactsSyncContext();
  const matches = propMatches ?? context?.matches ?? [];
  const onStartChat = propOnStartChat ?? context?.onStartChat;

  return (
    <View className="items-center justify-center py-10">
      <MatchedContactsCard matches={matches} onPressAction={onStartChat} />
      {onStartChat && (
        <View className="w-full px-8 mt-4">
          <Button title="Start a Conversation" onPress={onStartChat} />
        </View>
      )}
    </View>
  );
}

import React from "react";
import { View } from "react-native";
import Button from "@/shared/components/Button";
import { MatchedContactsCard } from "./MatchedContactsCard";
import { MatchedContactItem } from "../hooks/useSyncContacts";

export interface ContactsMatchedStateProps {
  /** Array of matched contacts to display */
  matches?: MatchedContactItem[];
  /** Action when tapping a contact or starting a conversation */
  onStartChat?: () => void;
}

/**
 * Screen displayed after synchronization finds at least one contact on Chatme.
 */
export function ContactsMatchedState({
  matches = [],
  onStartChat,
}: ContactsMatchedStateProps = {}) {
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


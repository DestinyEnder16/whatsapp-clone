import React from "react";
import { ActivityIndicator, Linking, Text, View } from "react-native";
import { PermissionStatus } from "expo-contacts";
import Button from "@/shared/components/Button";
import Ionicons from "@react-native-vector-icons/ionicons";
import colors from "@/shared/theme/colors";
import { MatchedContactsCard } from "./MatchedContactsCard";
import { useSyncContacts } from "../hooks/useSyncContacts";

interface ContactsEmptyStateProps {
  onStartChat?: () => void;
}

export function ContactsEmptyState({ onStartChat }: ContactsEmptyStateProps) {
  const {
    permissionStatus,
    isSyncing,
    matches,
    hasSynced,
    error,
    requestAndSync,
  } = useSyncContacts();

  // 1. Loading / Syncing State
  if (isSyncing) {
    return (
      <View className="flex-1 items-center justify-center py-16 px-6">
        <ActivityIndicator size="large" color={colors.primary[400]} />
        <Text className="text-neutral-500 mt-4 text-sm text-center">
          Finding your friends on Chatme...
        </Text>
      </View>
    );
  }

  // 2. Synced with Matched Contacts
  if (hasSynced && matches.length > 0) {
    return (
      <View className="items-center justify-center py-10">
        <MatchedContactsCard
          matches={matches}
          onPressAction={onStartChat}
        />
        {onStartChat && (
          <View className="w-full px-8 mt-4">
            <Button title="Start a Conversation" onPress={onStartChat} />
          </View>
        )}
      </View>
    );
  }

  // 3. Synced but No Contacts Found
  if (hasSynced && matches.length === 0) {
    return (
      <View className="items-center justify-center py-14 px-8">
        <View className="w-16 h-16 rounded-full bg-neutral-100 items-center justify-center mb-4">
          <Ionicons name="people-outline" size={32} color={colors.neutral[400]} />
        </View>
        <Text className="text-neutral-900 font-bold text-lg text-center mb-2">
          No contacts found yet
        </Text>
        <Text className="text-neutral-500 text-sm text-center mb-6 leading-5">
          None of your contacts are currently on Chatme. Invite your friends or start a chat directly by phone number!
        </Text>
        <View className="w-full">
          <Button title="Sync Contacts Again" onPress={requestAndSync} />
        </View>
      </View>
    );
  }

  // 4. Permission Denied State
  if (permissionStatus === PermissionStatus.DENIED) {
    return (
      <View className="items-center justify-center py-14 px-8">
        <View className="w-16 h-16 rounded-full bg-amber-50 items-center justify-center mb-4">
          <Ionicons name="lock-closed-outline" size={30} color="#D97706" />
        </View>
        <Text className="text-neutral-900 font-bold text-lg text-center mb-2">
          Contacts Permission Needed
        </Text>
        <Text className="text-neutral-500 text-sm text-center mb-6 leading-5">
          Chatme needs permission to see which of your friends are already here. Please enable contacts in your device settings.
        </Text>
        <View className="w-full">
          <Button title="Open Settings" onPress={() => Linking.openSettings()} />
        </View>
      </View>
    );
  }

  // 5. Initial State (No search has happened yet)
  return (
    <View className="items-center justify-center py-12 px-6">
      <View className="w-16 h-16 rounded-full bg-emerald-50 items-center justify-center mb-5">
        <Ionicons name="people" size={32} color={colors.primary[400]} />
      </View>

      <Text className="text-neutral-900 font-bold text-xl text-center mb-2">
        Find Friends on Chatme
      </Text>

      <Text className="text-neutral-500 text-sm text-center mb-8 px-4 leading-5">
        Sync your contacts to see which of your friends and family are already on Chatme.
      </Text>

      {error && (
        <Text className="text-red-500 text-xs text-center mb-4 px-2">
          {error}
        </Text>
      )}

      <View className="w-full px-4">
        <Button
          title="Find My Contacts"
          onPress={requestAndSync}
          isLoading={isSyncing}
        />
      </View>
    </View>
  );
}

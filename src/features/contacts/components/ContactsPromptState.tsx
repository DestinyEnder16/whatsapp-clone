import React from "react";
import { Text, View } from "react-native";
import Button from "@/shared/components/Button";
import Ionicons from "@react-native-vector-icons/ionicons";
import colors from "@/shared/theme/colors";

export interface ContactsPromptStateProps {
  /** Trigger function to prompt contacts permission and sync */
  onSync?: () => void;
  /** True while the sync operation is running */
  isSyncing?: boolean;
  /** Error message string to display, if any */
  error?: string | null;
  /** Optional custom title text */
  title?: string;
  /** Optional custom description text */
  description?: string;
}

/**
 * Initial screen prompting the user to sync contacts and find friends on Chatme.
 */
export function ContactsPromptState({
  onSync,
  isSyncing = false,
  error,
  title = "Find Friends on Chatme",
  description = "Sync your contacts to see which of your friends and family are already on Chatme.",
}: ContactsPromptStateProps = {}) {
  return (
    <View className="items-center justify-center py-12 px-6">
      <View className="w-16 h-16 rounded-full bg-emerald-50 items-center justify-center mb-5">
        <Ionicons name="people" size={32} color={colors.primary[400]} />
      </View>

      <Text className="text-neutral-900 font-bold text-xl text-center mb-2">
        {title}
      </Text>

      <Text className="text-neutral-500 text-sm text-center mb-8 px-4 leading-5">
        {description}
      </Text>

      {error && (
        <Text className="text-red-500 text-xs text-center mb-4 px-2">
          {error}
        </Text>
      )}

      {onSync && (
        <View className="w-full px-4">
          <Button
            title="Find My Contacts"
            onPress={onSync}
            isLoading={isSyncing}
          />
        </View>
      )}
    </View>
  );
}


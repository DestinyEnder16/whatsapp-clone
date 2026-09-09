import React from "react";
import { Text, View } from "react-native";
import Button from "@/shared/components/Button";
import Ionicons from "@react-native-vector-icons/ionicons";
import colors from "@/shared/theme/colors";
import { useContactsSyncContext } from "../context/ContactsSyncContext";

export interface ContactsPromptStateProps {
  onSync?: () => void;
  isSyncing?: boolean;
  error?: string | null;
  title?: string;
  description?: string;
}

export function ContactsPromptState({
  onSync: propOnSync,
  isSyncing: propIsSyncing,
  error: propError,
  title = "Find Friends on Chatme",
  description = "Sync your contacts to see which of your friends and family are already on Chatme.",
}: ContactsPromptStateProps = {}) {
  const context = useContactsSyncContext();
  const handleSync = propOnSync ?? context?.requestAndSync;
  const isSyncing = propIsSyncing ?? context?.isSyncing ?? false;
  const error = propError !== undefined ? propError : context?.error;

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

      {handleSync && (
        <View className="w-full px-4">
          <Button
            title="Find My Contacts"
            onPress={handleSync}
            isLoading={isSyncing}
          />
        </View>
      )}
    </View>
  );
}

import React from 'react';
import { Linking, Text, View } from 'react-native';
import Button from '@/shared/components/Button';
import Ionicons from '@react-native-vector-icons/ionicons';

export interface ContactsPermissionDeniedStateProps {
  onOpenSettings?: () => void;
  title?: string;
  description?: string;
}

export function ContactsPermissionDeniedState({
  onOpenSettings = () => Linking.openSettings(),
  title = 'Contacts Permission Needed',
  description = 'Chatme needs permission to see which of your friends are already here. Please enable contacts in your device settings.',
}: ContactsPermissionDeniedStateProps = {}) {
  return (
    <View className="items-center justify-center py-14 px-8">
      <View className="w-16 h-16 rounded-full bg-amber-50 items-center justify-center mb-4">
        <Ionicons name="lock-closed-outline" size={30} color="#D97706" />
      </View>
      <Text className="text-neutral-900 font-bold text-lg text-center mb-2">
        {title}
      </Text>
      <Text className="text-neutral-500 text-sm text-center mb-6 leading-5">
        {description}
      </Text>
      <View className="w-full">
        <Button title="Open Settings" onPress={onOpenSettings} />
      </View>
    </View>
  );
}

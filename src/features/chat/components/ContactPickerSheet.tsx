// src/features/chat/components/ContactPickerSheet.tsx
import { useContactMatchesStore } from '@/features/contacts/store/useContactMatchesStore';
import { AppText, AppTextInput } from '@/shared/components';
import { useAppTheme } from '@/shared/hooks';
import { toast } from '@/shared/utils/toast';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  SectionList,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateDirectConversation } from '../api/useCreateDirectConversation';
import { useSearchUsers } from '../api/useSearchUsers';

export interface ContactPickerItem {
  id: string;
  name: string;
  phoneOrHandle: string;
  avatarUrl?: string | null;
}

interface ContactPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectContact?: (contact: ContactPickerItem) => void;
}

export function ContactPickerSheet({
  visible,
  onClose,
  onSelectContact,
}: ContactPickerSheetProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const matchedContacts = useContactMatchesStore((state) => state.matches);

  // Track keyboard height to adjust scroll padding
  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Reset keyboard state & query when sheet closes
  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      setSearchQuery('');
      setIsInputFocused(false);
    }
  }, [visible]);

  // Maintain consistent height matching Mockups 1 & 2 (~88% of screen)
  const screenHeight = Math.max(
    Dimensions.get('screen').height,
    Dimensions.get('window').height
  );
  const sheetHeight = Math.min(
    Math.round(screenHeight * 0.88),
    screenHeight - Math.max(insets.top, 24) - 16
  );

  const { data: apiSearchResults, isLoading: isSearchingApi } =
    useSearchUsers(searchQuery);
  const createDirectMutation = useCreateDirectConversation();

  // Only users returned by the server may be selected for conversation creation.
  const sections = useMemo(() => {
    const matchedItems: ContactPickerItem[] = matchedContacts.map((match) => ({
      id: match.user.id,
      name:
        match.localName ||
        (typeof match.user.displayName === 'string'
          ? match.user.displayName
          : 'ChatMe User'),
      phoneOrHandle: 'From your contacts',
      avatarUrl: match.user.avatarUrl,
    }));
    const searchedItems: ContactPickerItem[] = (
      apiSearchResults?.items || []
    ).map((u) => ({
      id: u.id,
      name:
        typeof u.displayName === 'string' && u.displayName
          ? u.displayName
          : 'ChatMe User',
      phoneOrHandle: 'Found on ChatMe',
      avatarUrl: u.avatarUrl,
    }));
    const uniqueItems = new Map<string, ContactPickerItem>();
    [...matchedItems, ...searchedItems].forEach((item) =>
      uniqueItems.set(item.id, item)
    );
    let list: ContactPickerItem[] = [...uniqueItems.values()];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phoneOrHandle.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => a.name.localeCompare(b.name));

    // Group into sections by first letter
    const grouped: { [letter: string]: ContactPickerItem[] } = {};
    for (const item of list) {
      const letter = item.name.charAt(0).toUpperCase() || '#';
      if (!grouped[letter]) {
        grouped[letter] = [];
      }
      grouped[letter].push(item);
    }

    return Object.keys(grouped)
      .sort()
      .map((letter) => ({
        title: letter,
        data: grouped[letter],
      }));
  }, [apiSearchResults?.items, matchedContacts, searchQuery]);

  const handleSelect = (contact: ContactPickerItem) => {
    if (createDirectMutation.isPending) return;

    createDirectMutation.mutate(
      { participantId: contact.id },
      {
        onSuccess: (newConv: any) => {
          if (!newConv?.id) {
            toast.error(
              'Error',
              'The conversation was not created. Please try again.'
            );
            return;
          }

          onSelectContact?.(contact);
          onClose();
          router.push({
            pathname: '/chat/[id]',
            params: {
              id: newConv.id,
              name: contact.name,
              avatarUrl: contact.avatarUrl || '',
              status: 'Active 5 minutes ago',
              otherParticipantId: contact.id,
            },
          } as any);
        },
        onError: (error: any) => {
          toast.error(
            'Failed',
            error?.message || 'Could not start conversation. Please try again.'
          );
        },
      }
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      >
        {/* Top green backdrop background */}
        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
          className="flex-1"
          style={{ backgroundColor: colors.primary, opacity: 0.15 }}
        />

        {/* Modal Sheet Card matching Mockup 1 & 2 with maintained height */}
        <View
          className="w-full rounded-t-[32px] overflow-hidden"
          style={{
            backgroundColor: colors.background,
            height: sheetHeight,
            minHeight: sheetHeight,
          }}
        >
          {/* Drag Handle Bar */}
          <View className="items-center pt-3 pb-2">
            <View
              className="w-12 h-1 rounded-full"
              style={{ backgroundColor: isDark ? '#4B5563' : '#D1D5DB' }}
            />
          </View>

          {/* Title Header */}
          <View className="items-center py-2 px-6">
            <AppText
              className="text-[20px] text-center"
              style={{ color: colors.text, fontFamily: 'SFPRODISPLAYBOLD' }}
            >
              Contact
            </AppText>
          </View>

          {/* Search Bar matching Mockup 1 & 2 with green active highlight */}
          <View className="px-6 pt-2 pb-3">
            <View
              className="flex-row items-center px-4 py-3 rounded-2xl border"
              style={{
                backgroundColor: isDark ? colors.surface : '#F9FAFB',
                borderColor: isInputFocused ? colors.primary : colors.border,
                borderWidth: isInputFocused ? 1.5 : 1,
              }}
            >
              <Ionicons
                name="search"
                size={20}
                color={isInputFocused ? colors.primary : colors.textMuted}
                style={{ marginRight: 10 }}
              />
              <AppTextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder="Search people..."
                placeholderTextColor={colors.textMuted}
                className="flex-1 text-[15px]"
                style={{
                  color: colors.text,
                  fontFamily: 'SFPRODISPLAYREGULAR',
                }}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.textMuted}
                  />
                </Pressable>
              )}
            </View>
          </View>

          {/* Loading Indicator */}
          {(createDirectMutation.isPending || isSearchingApi) && (
            <View className="py-2 items-center justify-center flex-row">
              <ActivityIndicator size="small" color={colors.primary} />
              <AppText
                className="text-[13px] ml-2"
                style={{
                  color: colors.primary,
                  fontFamily: 'SFPRODISPLAYMEDIUM',
                }}
              >
                {createDirectMutation.isPending
                  ? 'Opening conversation...'
                  : 'Searching people...'}
              </AppText>
            </View>
          )}

          {/* Contact SectionList grouped alphabetically */}
          <SectionList
            className="flex-1"
            style={{ flex: 1 }}
            sections={sections}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom, 24) + keyboardHeight,
            }}
            renderSectionHeader={({ section: { title } }) => (
              <View
                className="px-6 py-1.5"
                style={{
                  backgroundColor: isDark ? colors.surface : '#F3F4F6',
                }}
              >
                <AppText
                  className="text-[13px] uppercase tracking-wider"
                  style={{
                    color: isDark ? colors.textMuted : '#6B7280',
                    fontFamily: 'SFPRODISPLAYBOLD',
                  }}
                >
                  {title}
                </AppText>
              </View>
            )}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item)}
                disabled={createDirectMutation.isPending}
                className="flex-row items-center px-6 py-3 active:opacity-70"
              >
                {/* Circular Avatar */}
                <View
                  className="w-12 h-12 rounded-full overflow-hidden items-center justify-center mr-3.5 border"
                  style={{
                    backgroundColor: colors.primaryLight,
                    borderColor: colors.border,
                  }}
                >
                  {item.avatarUrl ? (
                    <Image
                      source={{ uri: item.avatarUrl }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  ) : (
                    <AppText
                      className="text-[18px]"
                      style={{
                        color: colors.primaryDark,
                        fontFamily: 'SFPRODISPLAYBOLD',
                      }}
                    >
                      {item.name.charAt(0).toUpperCase()}
                    </AppText>
                  )}
                </View>

                {/* Name & Phone Number */}
                <View className="flex-1 mr-2">
                  <AppText
                    className="text-[16px]"
                    style={{
                      color: colors.text,
                      fontFamily: 'SFPRODISPLAYBOLD',
                    }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </AppText>
                  <AppText
                    className="text-[13px] mt-0.5"
                    style={{
                      color: colors.textSecondary,
                      fontFamily: 'SFPRODISPLAYREGULAR',
                    }}
                    numberOfLines={1}
                  >
                    {item.phoneOrHandle}
                  </AppText>
                </View>

                {/* Right Chevron > matching mockup */}
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isDark ? '#9CA3AF' : '#CBD5E1'}
                />
              </Pressable>
            )}
            ListEmptyComponent={() => (
              <View className="items-center justify-center py-16 px-6">
                <Ionicons
                  name="search-outline"
                  size={44}
                  color={colors.textMuted}
                  style={{ marginBottom: 10 }}
                />
                <AppText
                  className="text-[16px] text-center"
                  style={{ color: colors.text, fontFamily: 'SFPRODISPLAYBOLD' }}
                >
                  No contacts found
                </AppText>
                <AppText
                  className="text-[13px] text-center mt-1"
                  style={{
                    color: colors.textSecondary,
                    fontFamily: 'SFPRODISPLAYREGULAR',
                  }}
                >
                  Try searching for another name or phone number
                </AppText>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

export default ContactPickerSheet;

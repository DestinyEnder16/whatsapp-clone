import React from "react";
import { PermissionStatus } from "expo-contacts";
import { useSyncContacts } from "../hooks/useSyncContacts";
import { ContactsSyncingState } from "./ContactsSyncingState";
import { ContactsMatchedState } from "./ContactsMatchedState";
import { ContactsNotFoundState } from "./ContactsNotFoundState";
import { ContactsPermissionDeniedState } from "./ContactsPermissionDeniedState";
import { ContactsPromptState } from "./ContactsPromptState";

export interface ContactsEmptyStateProps {
  /** Optional callback fired when navigating into a conversation from matched contacts */
  onStartChat?: () => void;
}

/**
 * ContactsEmptyState
 *
 * The primary empty state displayed when a user has zero chats.
 * Directly calls `useSyncContacts()` and renders the matching UI state:
 * 1. Syncing: While permissions are being requested or contacts are syncing.
 * 2. Matched: Shows contact cards when friends are found on Chatme.
 * 3. Not Found: Shows an invite screen when 0 contacts are found on Chatme.
 * 4. Permission Denied: Shows instructions to open Settings if access was denied.
 * 5. Prompt: Initial default screen prompting the user to find their friends.
 */
export function ContactsEmptyState({
  onStartChat,
}: ContactsEmptyStateProps = {}) {
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
    return <ContactsSyncingState />;
  }

  // 2. Synced with Matched Contacts
  if (hasSynced && matches.length > 0) {
    return <ContactsMatchedState matches={matches} onStartChat={onStartChat} />;
  }

  // 3. Synced but No Contacts Found
  if (hasSynced && matches.length === 0) {
    return <ContactsNotFoundState onRetry={requestAndSync} />;
  }

  // 4. Permission Denied State
  if (permissionStatus === PermissionStatus.DENIED) {
    return <ContactsPermissionDeniedState />;
  }

  // 5. Initial State (No sync has happened yet)
  return (
    <ContactsPromptState
      onSync={requestAndSync}
      isSyncing={isSyncing}
      error={error}
    />
  );
}



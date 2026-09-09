import React from "react";
import { PermissionStatus } from "expo-contacts";
import {
  ContactsSyncProvider,
  useContactsSyncContext,
} from "../context/ContactsSyncContext";
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
 * Internal router that reads context and renders the appropriate UI state.
 *
 * State Machine Evaluation Order:
 * 1. Syncing: If a network or permission request is in-flight, show loading spinner.
 * 2. Matched: If sync finished and >=1 contacts found on WhatsApp, display matched contact cards.
 * 3. Not Found: If sync finished and 0 contacts found, display "No contacts on WhatsApp" invite screen.
 * 4. Permission Denied: If user explicitly declined contact permission, show settings guidance.
 * 5. Prompt: Default initial state before the user initiates their first sync.
 */
function ContactsEmptyStateContent() {
  const context = useContactsSyncContext();
  if (!context) return null;

  const { isSyncing, hasSynced, matches, permissionStatus } = context;

  // 1. Loading / Syncing State
  if (isSyncing) {
    return <ContactsSyncingState />;
  }

  // 2. Synced with Matched Contacts
  if (hasSynced && matches.length > 0) {
    return <ContactsMatchedState />;
  }

  // 3. Synced but No Contacts Found
  if (hasSynced && matches.length === 0) {
    return <ContactsNotFoundState />;
  }

  // 4. Permission Denied State
  if (permissionStatus === PermissionStatus.DENIED) {
    return <ContactsPermissionDeniedState />;
  }

  // 5. Initial State (No sync has happened yet)
  return <ContactsPromptState />;
}

/**
 * ContactsEmptyState
 *
 * The primary entry point component for displaying contacts discovery when the chat list is empty.
 *
 * Smart Provider Detection:
 * - If wrapped by a parent `<ContactsSyncProvider>` (e.g. in tests, custom layouts, or parent screens),
 *   it directly renders the content using the parent's context.
 * - If rendered standalone without a parent provider (e.g. inside `ChatScreen`), it automatically wraps
 *   itself in `<ContactsSyncProvider>`, making it completely plug-and-play with zero setup needed!
 */
export function ContactsEmptyState({
  onStartChat,
}: ContactsEmptyStateProps = {}) {
  const existingContext = useContactsSyncContext();

  if (existingContext) {
    return <ContactsEmptyStateContent />;
  }

  return (
    <ContactsSyncProvider onStartChat={onStartChat}>
      <ContactsEmptyStateContent />
    </ContactsSyncProvider>
  );
}

// Compound component attachments:
// Allows parent components to assemble custom layouts using dot notation
// (e.g., <ContactsEmptyState.Matched /> or <ContactsEmptyState.Provider>)
ContactsEmptyState.Syncing = ContactsSyncingState;
ContactsEmptyState.Matched = ContactsMatchedState;
ContactsEmptyState.NotFound = ContactsNotFoundState;
ContactsEmptyState.PermissionDenied = ContactsPermissionDeniedState;
ContactsEmptyState.Prompt = ContactsPromptState;
ContactsEmptyState.Provider = ContactsSyncProvider;


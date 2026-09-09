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
  onStartChat?: () => void;
}

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

// Compound component attachments for flexible composition without prop passing
ContactsEmptyState.Syncing = ContactsSyncingState;
ContactsEmptyState.Matched = ContactsMatchedState;
ContactsEmptyState.NotFound = ContactsNotFoundState;
ContactsEmptyState.PermissionDenied = ContactsPermissionDeniedState;
ContactsEmptyState.Prompt = ContactsPromptState;
ContactsEmptyState.Provider = ContactsSyncProvider;

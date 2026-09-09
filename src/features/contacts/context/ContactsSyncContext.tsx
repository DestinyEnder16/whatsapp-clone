import React, { createContext, useContext } from "react";
import { PermissionStatus } from "expo-contacts";
import {
  MatchedContactItem,
  useSyncContacts,
} from "../hooks/useSyncContacts";

/**
 * Shape of the data and actions exposed across the Contacts Sync feature tree.
 */
export interface ContactsSyncContextValue {
  /** Current OS permission state for device contacts */
  permissionStatus: PermissionStatus | null;
  /** True while requesting permission or uploading contacts to the backend */
  isSyncing: boolean;
  /** Contacts registered on WhatsApp with their local phonebook names */
  matches: MatchedContactItem[];
  /** Flag indicating if at least one sync cycle has completed */
  hasSynced: boolean;
  /** Error message if permission or network sync failed */
  error: string | null;
  /** Trigger function to prompt permissions and run the sync flow */
  requestAndSync: () => Promise<void>;
  /** Optional navigation callback when the user taps on a contact or starts a chat */
  onStartChat?: () => void;
}

/**
 * React Context instance for Contacts Synchronization.
 * Defaults to null when rendered outside of a ContactsSyncProvider.
 */
export const ContactsSyncContext =
  createContext<ContactsSyncContextValue | null>(null);

export interface ContactsSyncProviderProps {
  children: React.ReactNode;
  /**
   * Optional partial override of context values.
   *
   * Why this exists (Dependency Injection / Testing pattern):
   * This allows stories, unit tests, or preview components to inject mock states
   * (e.g., mock matches, mock error, mock permission denied) WITHOUT having to mock
   * native modules like expo-contacts or network calls to the backend.
   */
  value?: Partial<ContactsSyncContextValue>;
  /** Global navigation callback forwarded into the context */
  onStartChat?: () => void;
}

/**
 * ContactsSyncProvider
 *
 * Wraps child components with the contacts synchronization state.
 * By default, it connects to the real `useSyncContacts()` hook. Any fields passed
 * in the optional `value` prop will override the real hook values, making testing
 * and UI component previews trivial.
 */
export function ContactsSyncProvider({
  children,
  value,
  onStartChat,
}: ContactsSyncProviderProps) {
  // Real hook executing native device calls and API mutations
  const syncState = useSyncContacts();

  // Merge hook state with optional overrides (fallback to hook state if override is undefined)
  const contextValue: ContactsSyncContextValue = {
    permissionStatus: value?.permissionStatus ?? syncState.permissionStatus,
    isSyncing: value?.isSyncing ?? syncState.isSyncing,
    matches: value?.matches ?? syncState.matches,
    hasSynced: value?.hasSynced ?? syncState.hasSynced,
    error: value?.error !== undefined ? value.error : syncState.error,
    requestAndSync: value?.requestAndSync ?? syncState.requestAndSync,
    onStartChat: value?.onStartChat ?? onStartChat,
  };

  return (
    <ContactsSyncContext.Provider value={contextValue}>
      {children}
    </ContactsSyncContext.Provider>
  );
}

/**
 * Custom hook to consume the ContactsSyncContext.
 *
 * Returns `null` if called outside of a `<ContactsSyncProvider>`, allowing components
 * like `ContactsEmptyState` to detect whether they need to self-wrap or inherit an existing context.
 */
export function useContactsSyncContext(): ContactsSyncContextValue | null {
  return useContext(ContactsSyncContext);
}


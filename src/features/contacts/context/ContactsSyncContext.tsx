import React, { createContext, useContext } from "react";
import { PermissionStatus } from "expo-contacts";
import {
  MatchedContactItem,
  useSyncContacts,
} from "../hooks/useSyncContacts";

export interface ContactsSyncContextValue {
  permissionStatus: PermissionStatus | null;
  isSyncing: boolean;
  matches: MatchedContactItem[];
  hasSynced: boolean;
  error: string | null;
  requestAndSync: () => Promise<void>;
  onStartChat?: () => void;
}

export const ContactsSyncContext =
  createContext<ContactsSyncContextValue | null>(null);

export interface ContactsSyncProviderProps {
  children: React.ReactNode;
  value?: Partial<ContactsSyncContextValue>;
  onStartChat?: () => void;
}

export function ContactsSyncProvider({
  children,
  value,
  onStartChat,
}: ContactsSyncProviderProps) {
  const syncState = useSyncContacts();

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

export function useContactsSyncContext(): ContactsSyncContextValue | null {
  return useContext(ContactsSyncContext);
}

import { useCallback, useEffect, useState } from "react";
import * as Contacts from "expo-contacts";
import { Contact, ContactField } from "expo-contacts";
import {
  ContactMatchDto,
  useMatchContacts,
} from "../api/useMatchContacts";
import { normalizePhoneNumber, normalizePhoneNumbers } from "../utils/phoneUtils";

export interface MatchedContactItem extends ContactMatchDto {
  localName?: string;
}

export function useSyncContacts() {
  const [permissionStatus, setPermissionStatus] =
    useState<Contacts.PermissionStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [matches, setMatches] = useState<MatchedContactItem[]>([]);
  const [hasSynced, setHasSynced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchMutation = useMatchContacts();

  // Check current permission on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Contacts.getPermissionsAsync();
        setPermissionStatus(status);
      } catch (err) {
        console.warn("Failed to check contacts permission:", err);
      }
    })();
  }, []);

  const requestAndSync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);

    try {
      // 1. Request permission
      let currentStatus = permissionStatus;
      console.log("👉 Checking contacts permission status:", currentStatus);
      if (currentStatus !== Contacts.PermissionStatus.GRANTED) {
        console.log("👉 Requesting contacts permission via Contacts.requestPermissionsAsync()...");
        const res = await Contacts.requestPermissionsAsync();
        console.log("👉 Permission response:", JSON.stringify(res));
        currentStatus = res.status;
        setPermissionStatus(currentStatus);
      }

      if (currentStatus !== Contacts.PermissionStatus.GRANTED) {
        console.warn("⚠️ Contacts permission not granted. Status:", currentStatus);
        setIsSyncing(false);
        return;
      }

      console.log("✅ Contacts permission granted! Fetching device contacts...");

      // 2. Fetch device contacts
      const deviceContacts = await Contact.getAllDetails([
        ContactField.FULL_NAME,
        ContactField.PHONES,
      ]);

      if (!deviceContacts || deviceContacts.length === 0) {
        setMatches([]);
        setHasSynced(true);
        setIsSyncing(false);
        return;
      }

      // Map phone numbers to local contact names
      const phoneToLocalName = new Map<string, string>();
      const allNumbers: string[] = [];

      for (const contact of deviceContacts) {
        const name = contact.fullName || "Friend";
        const phones = contact.phones || [];

        for (const phoneObj of phones) {
          if (phoneObj.number) {
            allNumbers.push(phoneObj.number);
            const normalized = normalizePhoneNumber(phoneObj.number);
            if (normalized && !phoneToLocalName.has(normalized)) {
              phoneToLocalName.set(normalized, name);
            }
          }
        }
      }

      // 3. Normalize & deduplicate phone numbers
      const normalizedNumbers = normalizePhoneNumbers(allNumbers);

      if (normalizedNumbers.length === 0) {
        setMatches([]);
        setHasSynced(true);
        setIsSyncing(false);
        return;
      }

      // 4. Upload to backend API
      const result = await matchMutation.mutateAsync({
        phoneNumbers: normalizedNumbers,
      });

      // 5. Enrich matches with local contact names
      const enriched: MatchedContactItem[] = (result.matches || []).map(
        (match) => ({
          ...match,
          localName:
            phoneToLocalName.get(match.matchedPhoneNumber) ||
            (typeof match.user?.displayName === "string"
              ? match.user.displayName
              : undefined),
        })
      );

      setMatches(enriched);
      setHasSynced(true);
    } catch (err: any) {
      console.error("Failed to sync contacts:", err);
      setError(err?.message || "Failed to sync contacts");
    } finally {
      setIsSyncing(false);
    }
  }, [matchMutation, permissionStatus]);

  return {
    permissionStatus,
    isSyncing,
    matches,
    hasSynced,
    error,
    requestAndSync,
  };
}

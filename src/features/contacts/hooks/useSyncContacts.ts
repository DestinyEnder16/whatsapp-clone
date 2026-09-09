import { useCallback, useEffect, useState } from "react";
import * as Contacts from "expo-contacts";
import { Contact, ContactField } from "expo-contacts";
import {
  ContactMatchDto,
  useMatchContacts,
} from "../api/useMatchContacts";
import { normalizePhoneNumber, normalizePhoneNumbers } from "../utils/phoneUtils";

/**
 * MatchedContactItem represents a contact found on WhatsApp, enriched with local device metadata.
 *
 * Why we extend `ContactMatchDto`:
 * The backend knows the user's public profile (e.g., `user.displayName` = "David Miller").
 * However, the user might have saved them in their phonebook as "Uncle Dave".
 * Privacy principle: We NEVER upload the contact's name to the backend. We only upload the phone number.
 * When the server returns matches, we merge the local phonebook name back into the result on the device.
 */
export interface MatchedContactItem extends ContactMatchDto {
  /** The name of the contact as saved locally on the device (e.g., "Dad", "Landlord") */
  localName?: string;
}

/**
 * Orchestrator hook for device contact discovery and synchronization.
 *
 * Responsibilities:
 * 1. Checks device contacts permission status on initial mount.
 * 2. Prompts the OS for contact permissions if not already granted.
 * 3. Reads device contacts and builds a lookup Map of (normalizedPhone -> localName).
 * 4. Normalizes and deduplicates all numbers to E.164.
 * 5. Sends batches to the backend via `useMatchContacts`.
 * 6. Enriches backend match results with device local contact names.
 * 7. Exposes unified state (`permissionStatus`, `isSyncing`, `matches`, `hasSynced`, `error`).
 */
export function useSyncContacts() {
  // OS permission state: GRANTED, DENIED, UNDETERMINED, or null (before initial check)
  const [permissionStatus, setPermissionStatus] =
    useState<Contacts.PermissionStatus | null>(null);

  // Loading state while permission request or network calls are active
  const [isSyncing, setIsSyncing] = useState(false);

  // Successfully matched contacts currently registered on the backend
  const [matches, setMatches] = useState<MatchedContactItem[]>([]);

  // Tracks whether at least one sync attempt has completed (used by UI to distinguish initial vs empty state)
  const [hasSynced, setHasSynced] = useState(false);

  // Error message if permission failed or API request failed
  const [error, setError] = useState<string | null>(null);

  // Backend mutation hook (handles batching & self-healing retries)
  const matchMutation = useMatchContacts();

  // Phase 0: Non-intrusive check of current permission status on mount
  // (Does NOT trigger a system prompt popup, only reads existing permission state)
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

  /**
   * Main sync workflow: executed when the user taps "Find Contacts" or "Sync Contacts".
   */
  const requestAndSync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);

    try {
      // -----------------------------------------------------------------------
      // Phase 1: Permission Request & Verification
      // -----------------------------------------------------------------------
      let currentStatus = permissionStatus;
      console.log("👉 Checking contacts permission status:", currentStatus);

      // If not already granted, display the OS system permission dialog
      if (currentStatus !== Contacts.PermissionStatus.GRANTED) {
        console.log("👉 Requesting contacts permission via Contacts.requestPermissionsAsync()...");
        const res = await Contacts.requestPermissionsAsync();
        console.log("👉 Permission response:", JSON.stringify(res));
        currentStatus = res.status;
        setPermissionStatus(currentStatus);
      }

      // If user declined permission, stop gracefully
      if (currentStatus !== Contacts.PermissionStatus.GRANTED) {
        console.warn("⚠️ Contacts permission not granted. Status:", currentStatus);
        setIsSyncing(false);
        return;
      }

      console.log("✅ Contacts permission granted! Fetching device contacts...");

      // -----------------------------------------------------------------------
      // Phase 2: Fetch device contacts from phone storage
      // Only request the specific fields needed (FULL_NAME and PHONES) to optimize speed
      // -----------------------------------------------------------------------
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

      // -----------------------------------------------------------------------
      // Phase 3: Build local lookup map & collect phone numbers
      //
      // Why a Map?
      // When the backend replies with { matchedPhoneNumber: "+2348012345678" },
      // we need O(1) instantaneous lookup to find the name the user gave this person.
      // -----------------------------------------------------------------------
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

      // -----------------------------------------------------------------------
      // Phase 4: Normalize & deduplicate all phone numbers
      // Converts strings to E.164 (e.g., "+2348012345678") and removes duplicates
      // -----------------------------------------------------------------------
      const normalizedNumbers = normalizePhoneNumbers(allNumbers);

      if (normalizedNumbers.length === 0) {
        setMatches([]);
        setHasSynced(true);
        setIsSyncing(false);
        return;
      }

      // -----------------------------------------------------------------------
      // Phase 5: Upload normalized numbers to backend API for matching
      // (Batching and auto-retrying are handled inside matchMutation)
      // -----------------------------------------------------------------------
      const result = await matchMutation.mutateAsync({
        phoneNumbers: normalizedNumbers,
      });

      // -----------------------------------------------------------------------
      // Phase 6: Enrich matches with local address book names
      // Priority:
      // 1. Local name stored in user's phonebook (e.g., "Mom")
      // 2. Public WhatsApp displayName (e.g., "Jane Doe")
      // -----------------------------------------------------------------------
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


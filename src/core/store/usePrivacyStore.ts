// src/core/store/usePrivacyStore.ts
import { mmkvStorage } from "@/core/storage/mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PrivacyAudience = "everyone" | "contacts" | "nobody";

export interface PrivacyState {
  /** Who can see when user was last active */
  lastSeen: PrivacyAudience;
  /** Who can see the user profile picture */
  profilePhoto: PrivacyAudience;
  /** Who can see user about info */
  about: PrivacyAudience;
  /** Who can add user to groups */
  group: PrivacyAudience;
  /** Whether biometric (Face ID / fingerprint) app lock is enabled */
  faceIdEnabled: boolean;
}

export interface PrivacyActions {
  setLastSeen: (audience: PrivacyAudience) => void;
  setProfilePhoto: (audience: PrivacyAudience) => void;
  setAbout: (audience: PrivacyAudience) => void;
  setGroup: (audience: PrivacyAudience) => void;
  setFaceIdEnabled: (enabled: boolean) => void;
}

/**
 * Human-readable labels mapped to PrivacyAudience values
 */
export const PRIVACY_AUDIENCE_LABELS: Record<PrivacyAudience, string> = {
  everyone: "Everyone",
  contacts: "My Contact",
  nobody: "Nobody",
};

export const usePrivacyStore = create<PrivacyState & PrivacyActions>()(
  persist(
    (set) => ({
      // Defaults matching the design screens
      lastSeen: "everyone",
      profilePhoto: "contacts",
      about: "contacts",
      group: "everyone",
      faceIdEnabled: false,

      setLastSeen: (lastSeen) => set({ lastSeen }),
      setProfilePhoto: (profilePhoto) => set({ profilePhoto }),
      setAbout: (about) => set({ about }),
      setGroup: (group) => set({ group }),
      setFaceIdEnabled: (faceIdEnabled) => set({ faceIdEnabled }),
    }),
    {
      name: "privacy-settings-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

// src/services/notifications/installationId.ts
import { storage } from "@/core/storage/mmkv";

const INSTALLATION_ID_KEY = "chatme_device_installation_id";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retrieves the persistent installation identifier for this device instance.
 * If none exists, creates a unique UUID, persists it to MMKV, and returns it.
 */
export function getInstallationId(): string {
  let installationId = storage.getString(INSTALLATION_ID_KEY);

  if (!installationId) {
    installationId = generateUUID();
    storage.set(INSTALLATION_ID_KEY, installationId);
  }

  return installationId;
}

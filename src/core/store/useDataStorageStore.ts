// src/core/store/useDataStorageStore.ts
import { mmkvStorage } from "@/core/storage/mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AutoDownloadOption = "off" | "wifi" | "cellular";

export interface DataStorageState {
  photos: AutoDownloadOption;
  audio: AutoDownloadOption;
  documents: AutoDownloadOption;
  videos: AutoDownloadOption;
  /** Custom cleared cache timestamp to reflect cleared state */
  lastCacheClearedAt: number | null;
}

export interface DataStorageActions {
  setPhotos: (option: AutoDownloadOption) => void;
  setAudio: (option: AutoDownloadOption) => void;
  setDocuments: (option: AutoDownloadOption) => void;
  setVideos: (option: AutoDownloadOption) => void;
  clearCache: () => void;
}

export const AUTO_DOWNLOAD_LABELS: Record<AutoDownloadOption, string> = {
  off: "Off",
  wifi: "Wi-Fi",
  cellular: "Wi-Fi and Cellular",
};

export const useDataStorageStore = create<DataStorageState & DataStorageActions>()(
  persist(
    (set) => ({
      // Defaults matching the design screens
      photos: "off",
      audio: "wifi",
      documents: "cellular",
      videos: "off",
      lastCacheClearedAt: null,

      setPhotos: (photos) => set({ photos }),
      setAudio: (audio) => set({ audio }),
      setDocuments: (documents) => set({ documents }),
      setVideos: (videos) => set({ videos }),
      clearCache: () => set({ lastCacheClearedAt: Date.now() }),
    }),
    {
      name: "data-storage-settings",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

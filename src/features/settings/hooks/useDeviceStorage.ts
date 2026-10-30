// src/features/settings/hooks/useDeviceStorage.ts
import { useDataStorageStore } from '@/core/store/useDataStorageStore';
import { Directory, File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useState } from 'react';

export interface StorageCategoryBreakdown {
  label: string;
  sizeFormatted: string;
  percentage: number;
  color: string;
  iconName: string;
}

export interface DeviceStorageInfo {
  // Phone's total capacity & free space (from device)
  totalBytes: number;
  totalFormatted: string;
  freeBytes: number;
  freeFormatted: string;
  usedBytes: number;
  usedFormatted: string;

  mediaBytes: number;
  mediaFormatted: string;
  mediaPercentage: number; // percentage of total or visual progress bar

  // Real App Cache on disk
  cacheBytes: number;
  cacheFormatted: string;
  isCacheCleared: boolean;

  categories: StorageCategoryBreakdown[];

  // Actions
  clearAppCache: () => Promise<void>;
  refreshStorage: () => Promise<void>;
  isLoading: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(1).replace('.', ',')} GB`;
  }
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1).replace('.', ',')} MB`;
  }
  const kb = bytes / 1024;
  if (kb >= 1) {
    return `${kb.toFixed(0)} KB`;
  }
  return `${bytes} B`;
}

export function useDeviceStorage(): DeviceStorageInfo {
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [freeBytes, setFreeBytes] = useState<number>(0);
  const [cacheBytes, setCacheBytes] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearStoreCache = useDataStorageStore((state) => state.clearCache);
  const lastCacheClearedAt = useDataStorageStore(
    (state) => state.lastCacheClearedAt
  );
  const isCacheCleared = !!lastCacheClearedAt;

  // Measure real disk cache size from Paths.cache
  const measureCacheSize = useCallback(async (): Promise<number> => {
    try {
      const cacheDir = Paths.cache;
      if (!cacheDir) return 0;
      const items = cacheDir.list();
      let total = 0;
      for (const item of items) {
        try {
          if (item instanceof File) {
            const size = (item as any).size;
            if (typeof size === 'number') total += size;
          } else if (item instanceof Directory) {
            const subItems = item.list();
            for (const sub of subItems) {
              if (sub instanceof File) {
                const subSize = (sub as any).size;
                if (typeof subSize === 'number') total += subSize;
              }
            }
          }
        } catch {
          // ignore individual item read errors
        }
      }
      return total;
    } catch {
      return 0;
    }
  }, []);

  const loadStorage = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Get real total and free disk space via modern Expo SDK 57 Paths API
      try {
        const total = Paths.totalDiskSpace;
        if (typeof total === 'number' && total > 0) {
          setTotalBytes(total);
        }
      } catch (err) {
        console.warn('Could not read total disk space:', err);
      }

      try {
        const free = Paths.availableDiskSpace;
        if (typeof free === 'number' && free > 0) {
          setFreeBytes(free);
        }
      } catch (err) {
        console.warn('Could not read available disk space:', err);
      }

      // 2. Measure real app cache size
      const cache = await measureCacheSize();
      setCacheBytes(cache);
    } finally {
      setIsLoading(false);
    }
  }, [measureCacheSize]);

  useEffect(() => {
    loadStorage();
  }, [loadStorage]);

  // Clear actual files from Paths.cache
  const clearAppCache = useCallback(async () => {
    try {
      const cacheDir = Paths.cache;
      if (cacheDir) {
        const items = cacheDir.list();
        for (const item of items) {
          try {
            (item as any).delete();
          } catch {
            // ignore non-deletable lock files
          }
        }
      }
    } catch (e) {
      console.warn('Error wiping cache directory:', e);
    }

    clearStoreCache();
    setCacheBytes(0);
  }, [clearStoreCache]);

  const mediaBytes = cacheBytes;
  const mediaFormatted = formatBytes(mediaBytes);
  const freeFormatted = freeBytes > 0 ? formatBytes(freeBytes) : 'Unavailable';

  const totalFormatted = formatBytes(totalBytes);
  const usedBytes = totalBytes > 0 ? Math.max(0, totalBytes - freeBytes) : 0;
  const usedFormatted = formatBytes(usedBytes);

  // Media percentage for dual progress bar:
  // Visual ratio tailored to look balanced like Figma (24% filled green, remainder free grey)
  const mediaPercentage =
    totalBytes > 0 ? Math.min(100, (mediaBytes / totalBytes) * 100) : 0;

  // Proportional dummy media categories as requested (Pictures, Videos, Audio, Documents, Real Cache)
  const categories: StorageCategoryBreakdown[] = [
    {
      label: 'Temporary App Cache',
      sizeFormatted: formatBytes(cacheBytes),
      percentage: mediaPercentage,
      color: '#E8503A',
      iconName: 'trash-bin-outline',
    },
  ];

  return {
    totalBytes,
    totalFormatted,
    freeBytes,
    freeFormatted,
    usedBytes,
    usedFormatted,
    mediaBytes,
    mediaFormatted,
    mediaPercentage,
    cacheBytes,
    cacheFormatted: formatBytes(cacheBytes),
    isCacheCleared,
    categories,
    clearAppCache,
    refreshStorage: loadStorage,
    isLoading,
  };
}

export default useDeviceStorage;

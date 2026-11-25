// src/services/media/uploadOperationStore.ts
//
// Durable record of an in-progress media upload, so a failure part-way (or an
// app restart) can resume the failed stage instead of repeating a transfer that
// already succeeded. Entries are owned by the account that started them and are
// keyed by the client upload id, which is also the server idempotency key.
import { mmkvStorage } from '@/core/storage/mmkv';
import type { components } from '@/services/api/schema';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type MediaAsset = components['schemas']['MediaAssetResponseDto'];
export type MediaPurpose =
  components['schemas']['CreateMediaUploadDto']['purpose'];

/** The picked file. Mirrors SelectedMedia in uploadMedia.ts. */
export type StoredSelection = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
};

/**
 * selected    - nothing sent to the server yet
 * authorized  - server issued a media id and an upload target
 * transferred - the bytes reached storage; only completion is left
 * completed   - the server confirmed the media is ready
 */
export type UploadStage =
  | 'selected'
  | 'authorized'
  | 'transferred'
  | 'completed';

export interface UploadOperation {
  accountId: string;
  clientUploadId: string;
  purpose: MediaPurpose;
  /** Durable local copy of the selection (see persistSelection). */
  media: StoredSelection;
  stage: UploadStage;
  /** Server media id, once authorized. */
  mediaId?: string;
  /** Server response, once completed. */
  completedMedia?: MediaAsset;
  createdAt: string;
}

interface UploadOperationState {
  operations: Record<string, UploadOperation>;
  save: (operation: UploadOperation) => void;
  update: (
    accountId: string,
    clientUploadId: string,
    patch: Partial<Omit<UploadOperation, 'accountId' | 'clientUploadId'>>
  ) => void;
  get: (accountId: string, clientUploadId: string) => UploadOperation | undefined;
  remove: (accountId: string, clientUploadId: string) => void;
}

const operationKey = (accountId: string, clientUploadId: string) =>
  `${accountId}:${clientUploadId}`;

/**
 * The newest unfinished upload this account started for a purpose, if any.
 * Lets a screen offer to resume after a failure or an app restart.
 */
export function findPendingUpload(
  accountId: string | undefined,
  purpose: MediaPurpose
): UploadOperation | undefined {
  if (!accountId) return undefined;
  return Object.values(useUploadOperationStore.getState().operations)
    .filter(
      (operation) =>
        operation.accountId === accountId && operation.purpose === purpose
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export const useUploadOperationStore = create<UploadOperationState>()(
  persist(
    (set, get) => ({
      operations: {},
      save: (operation) =>
        set((state) => ({
          operations: {
            ...state.operations,
            [operationKey(operation.accountId, operation.clientUploadId)]:
              operation,
          },
        })),
      update: (accountId, clientUploadId, patch) =>
        set((state) => {
          const key = operationKey(accountId, clientUploadId);
          const existing = state.operations[key];
          if (!existing) return state;
          return {
            operations: { ...state.operations, [key]: { ...existing, ...patch } },
          };
        }),
      get: (accountId, clientUploadId) =>
        get().operations[operationKey(accountId, clientUploadId)],
      remove: (accountId, clientUploadId) =>
        set((state) => {
          const next = { ...state.operations };
          delete next[operationKey(accountId, clientUploadId)];
          return { operations: next };
        }),
    }),
    {
      name: 'media-upload-operations',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

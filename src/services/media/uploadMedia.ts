import {
  assertSessionOwnerCurrent,
  linkAbortSignals,
  SessionChangedError,
  throwIfAborted,
  type SessionOwner,
} from '@/core/session/sessionOwner';
import { api } from '@/services/api/client';
import type { components } from '@/services/api/schema';
import { Directory, File, Paths } from 'expo-file-system';
import {
  useUploadOperationStore,
  type UploadOperation,
} from './uploadOperationStore';

export type SelectedMedia = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
};

type MediaContentType =
  components['schemas']['CreateMediaUploadDto']['contentType'];
type MediaPurpose = components['schemas']['CreateMediaUploadDto']['purpose'];
type MediaAsset = components['schemas']['MediaAssetResponseDto'];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set<MediaContentType>([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/**
 * Who the upload works for, and how to stop it.
 *
 * `owner` is captured by the caller when the user starts the action (before any
 * await). It is verified after EVERY await below, so an upload that began in
 * account A can never authorize, transfer, complete or assign anything once
 * account B (or A again after a fresh login) is signed in.
 */
export interface UploadContext {
  owner: SessionOwner;
  /** Aborted on teardown (screen unmount, room change, logout). */
  signal?: AbortSignal;
}

export interface UploadOptions extends UploadContext {
  /**
   * Resume an earlier attempt: its server idempotency key and any stage that
   * already succeeded are reused instead of repeated. Omit to start a new one.
   */
  clientUploadId?: string;
}

export function createClientUploadId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    (character) => {
      const random = (Math.random() * 16) | 0;
      const value = character === 'x' ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    }
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return (error as { message?: string } | null)?.message || fallback;
}

function getFileMetadata(media: SelectedMedia) {
  const file = new File(media.uri);
  const sizeBytes = media.fileSize ?? file.size;
  const mimeType = media.mimeType || file.type || 'image/jpeg';
  const fileName = media.fileName || file.name || 'photo.jpg';

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error(
      'The selected file size is unavailable. Please choose it again.'
    );
  }
  if (!IMAGE_TYPES.has(mimeType as MediaContentType)) {
    throw new Error('Only JPEG, PNG, and WebP images are supported.');
  }
  if (sizeBytes > MAX_IMAGE_BYTES) {
    throw new Error('Images must be 5 MB or smaller.');
  }

  return {
    file,
    sizeBytes,
    mimeType: mimeType as MediaContentType,
    fileName,
  };
}

/**
 * Copy the picked file into the app's document directory so a retry after a
 * restart still has it (picker/camera files live in a cache the OS may purge).
 * Best effort: if the copy fails the original selection is used unchanged.
 */
function persistSelection(
  media: SelectedMedia,
  clientUploadId: string
): SelectedMedia {
  try {
    const directory = new Directory(Paths.document, 'pending-uploads');
    directory.create({ intermediates: true, idempotent: true });
    const source = new File(media.uri);
    const destination = new File(
      directory,
      `${clientUploadId}-${media.fileName || source.name || 'photo.jpg'}`
    );
    source.copy(destination);
    return { ...media, uri: destination.uri };
  } catch (error) {
    console.warn('Could not keep a durable copy of the selected file:', error);
    return media;
  }
}

/** Delete the durable copy once the upload is no longer needed. */
function deleteSelectionCopy(operation: UploadOperation) {
  try {
    if (operation.media.uri.includes('/pending-uploads/')) {
      new File(operation.media.uri).delete();
    }
  } catch {
    // Already gone, or not ours to delete.
  }
}

/**
 * Forget a finished upload (its media id has been used, or the user gave up).
 * Safe to call more than once.
 */
export function discardUploadOperation(
  accountId: string,
  clientUploadId: string
): void {
  const store = useUploadOperationStore.getState();
  const operation = store.get(accountId, clientUploadId);
  if (operation) deleteSelectionCopy(operation);
  store.remove(accountId, clientUploadId);
}

/**
 * Upload a picked image: authorize -> transfer bytes -> complete.
 *
 * Progress is persisted after each stage under the client upload id (also the
 * server idempotency key). Retrying with the same `clientUploadId` after a
 * failure continues from the stage that failed: a completion failure does not
 * transfer the file again, and an already-completed upload returns immediately.
 */
export async function uploadMedia(
  media: SelectedMedia,
  purpose: MediaPurpose,
  options: UploadOptions
): Promise<MediaAsset & { clientUploadId: string }> {
  const { owner } = options;
  // Cancelled by the caller (teardown) or when the owning session ends.
  const signal = linkAbortSignals(owner.signal, options.signal);
  // Uploads are authenticated work; there must be an account to own them.
  const accountId = owner.accountId;
  if (!accountId) throw new SessionChangedError();

  // Called after every await: stop if torn down or the session changed.
  const check = () => {
    throwIfAborted(signal);
    assertSessionOwnerCurrent(owner);
  };
  check();

  const store = useUploadOperationStore.getState();
  let operation = options.clientUploadId
    ? store.get(accountId, options.clientUploadId)
    : undefined;

  if (!operation) {
    getFileMetadata(media); // validate type/size before storing anything
    const clientUploadId = options.clientUploadId || createClientUploadId();
    operation = {
      accountId: accountId,
      clientUploadId,
      purpose,
      media: persistSelection(media, clientUploadId),
      stage: 'selected',
      createdAt: new Date().toISOString(),
    };
    store.save(operation);
  }

  const { clientUploadId } = operation;
  const record = (patch: Partial<UploadOperation>) => {
    store.update(accountId, clientUploadId, patch);
    operation = { ...operation!, ...patch };
  };

  if (operation.stage === 'completed' && operation.completedMedia) {
    return { ...operation.completedMedia, clientUploadId };
  }

  // Stage 1 + 2: authorize and transfer, unless the bytes already arrived.
  let mediaId = operation.mediaId;
  if (operation.stage === 'selected' || operation.stage === 'authorized') {
    const metadata = getFileMetadata(operation.media);
    const { data: authorization, error: authorizationError } = await api.POST(
      '/v1/media/uploads',
      {
        body: {
          clientUploadId,
          purpose,
          contentType: metadata.mimeType,
          sizeBytes: metadata.sizeBytes,
          originalFilename: metadata.fileName,
        },
        signal,
      }
    );
    check();

    if (authorizationError || !authorization?.media) {
      throw new Error(
        errorMessage(
          authorizationError,
          'The server rejected the upload request.'
        )
      );
    }
    mediaId = authorization.media.id;
    record({ stage: 'authorized', mediaId });

    if (authorization.upload) {
      const source = await fetch(operation.media.uri, { signal });
      check();
      if (!source.ok) throw new Error('The selected file could not be read.');
      const blob = await source.blob();
      check();
      const formData = new FormData();
      Object.entries(authorization.upload.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('file', blob as any, metadata.fileName);

      const transfer = await fetch(authorization.upload.url, {
        method: 'POST',
        body: formData,
        signal,
      });
      check();
      if (!transfer.ok) {
        throw new Error(`Media transfer failed (${transfer.status}).`);
      }
    }
    record({ stage: 'transferred' });
  }

  // Stage 3: completion. A failure here keeps stage 'transferred', so a retry
  // goes straight back to this call.
  const { data: completedMedia, error: completionError } = await api.POST(
    '/v1/media/uploads/{mediaId}/complete',
    { params: { path: { mediaId: mediaId! } }, signal }
  );
  check();

  if (completionError || !completedMedia || completedMedia.status !== 'ready') {
    throw new Error(
      errorMessage(completionError, 'The server could not complete the upload.')
    );
  }

  record({ stage: 'completed', completedMedia });
  return { ...completedMedia, clientUploadId };
}

/** Assign an uploaded image as the signed-in account's avatar. */
export async function assignProfileAvatar(
  mediaId: string,
  context: UploadContext
) {
  const { owner } = context;
  const signal = linkAbortSignals(owner.signal, context.signal);
  assertSessionOwnerCurrent(owner);
  throwIfAborted(signal);

  const { data, error } = await api.PUT('/v1/me/avatar', {
    body: { mediaId },
    signal,
  });

  // Validate ownership immediately before the caller writes the result.
  assertSessionOwnerCurrent(owner);
  if (error || !data) {
    throw new Error(
      errorMessage(error, 'The server could not assign the avatar.')
    );
  }
  return data;
}

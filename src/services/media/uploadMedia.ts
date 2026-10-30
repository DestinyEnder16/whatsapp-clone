import { api } from '@/services/api/client';
import type { components } from '@/services/api/schema';
import { File } from 'expo-file-system';

export type SelectedMedia = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
};

type MediaContentType =
  components['schemas']['CreateMediaUploadDto']['contentType'];
type MediaPurpose = components['schemas']['CreateMediaUploadDto']['purpose'];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set<MediaContentType>([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function createClientUploadId(): string {
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

export async function uploadMedia(
  media: SelectedMedia,
  purpose: MediaPurpose
): Promise<components['schemas']['MediaAssetResponseDto']> {
  const metadata = getFileMetadata(media);
  const clientUploadId = createClientUploadId();
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
    }
  );

  if (authorizationError || !authorization?.media) {
    throw new Error(
      errorMessage(
        authorizationError,
        'The server rejected the upload request.'
      )
    );
  }

  if (authorization.upload) {
    const source = await fetch(media.uri);
    if (!source.ok) throw new Error('The selected file could not be read.');
    const blob = await source.blob();
    const formData = new FormData();
    Object.entries(authorization.upload.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append('file', blob as any, metadata.fileName);

    const transfer = await fetch(authorization.upload.url, {
      method: 'POST',
      body: formData,
    });
    if (!transfer.ok) {
      throw new Error(`Media transfer failed (${transfer.status}).`);
    }
  }

  const { data: completedMedia, error: completionError } = await api.POST(
    '/v1/media/uploads/{mediaId}/complete',
    { params: { path: { mediaId: authorization.media.id } } }
  );

  if (completionError || !completedMedia || completedMedia.status !== 'ready') {
    throw new Error(
      errorMessage(completionError, 'The server could not complete the upload.')
    );
  }

  return completedMedia;
}

export async function assignProfileAvatar(mediaId: string) {
  const { data, error } = await api.PUT('/v1/me/avatar', {
    body: { mediaId },
  });
  if (error || !data) {
    throw new Error(
      errorMessage(error, 'The server could not assign the avatar.')
    );
  }
  return data;
}

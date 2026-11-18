// src/services/media/profileAvatar.ts
import type { components } from '@/services/api/schema';
import {
  assignProfileAvatar,
  discardUploadOperation,
  uploadMedia,
  type SelectedMedia,
  type UploadOptions,
} from './uploadMedia';

type UserProfile = components['schemas']['UserResponseDto'];

/**
 * Upload a picked image and make it the signed-in account's avatar.
 *
 * Both steps run for the same session owner, which is verified after each
 * await, so a slow upload can never set the avatar (or be written to the auth
 * store) after the session changed. Retrying with the same `clientUploadId`
 * resumes: a failed assignment does not transfer the file again.
 *
 * The caller writes the returned user to the auth store; ownership is verified
 * by assignProfileAvatar immediately before returning.
 */
export async function uploadProfileAvatar(
  media: SelectedMedia,
  options: UploadOptions
): Promise<UserProfile> {
  const completed = await uploadMedia(media, 'profile_avatar', options);
  const user = await assignProfileAvatar(completed.id, options);
  // Assigned: the durable upload record and local copy are no longer needed.
  if (options.owner.accountId) {
    discardUploadOperation(options.owner.accountId, completed.clientUploadId);
  }
  return user;
}

import {
  assertSessionOwnerCurrent,
  captureSessionOwner,
} from '@/core/session/sessionOwner';
import { api } from '@/services/api/client';
import type { components } from '@/services/api/schema';
import { useMutation } from '@tanstack/react-query';

export type UpdateProfileInput = components['schemas']['UpdateProfileDto'];
export type UserProfile = components['schemas']['UserResponseDto'];

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (payload: UpdateProfileInput): Promise<UserProfile> => {
      // Captured before the request; the API middleware supplies this
      // session's token.
      const owner = captureSessionOwner();

      const { data, error } = await api.PATCH('/v1/me', {
        body: payload,
        signal: owner.signal,
      });

      // Callers write the result to the auth store in onSuccess. Throwing here
      // means a profile saved by a previous session never reaches that write.
      assertSessionOwnerCurrent(owner);

      if (error) {
        throw new Error(
          (error as { message?: string }).message || 'Failed to update profile'
        );
      }

      return data;
    },
  });
}

import { useAuthStore } from '@/core/store/useAuthStore';
import { api } from '@/services/api/client';
import type { components } from '@/services/api/schema';
import { useMutation } from '@tanstack/react-query';

export type UpdateProfileInput = components['schemas']['UpdateProfileDto'];
export type UserProfile = components['schemas']['UserResponseDto'];

export function useUpdateProfile() {
    return useMutation({
        mutationFn: async (payload: UpdateProfileInput): Promise<UserProfile> => {
            const accessToken = useAuthStore.getState().accessToken;

            const { data, error } = await api.PATCH('/v1/me', {
                body: payload,
                headers: accessToken
                    ? {
                        Authorization: `Bearer ${accessToken}`,
                    }
                    : undefined,
            });

            if (error) {
                throw new Error(
                    (error as { message?: string }).message || 'Failed to update profile'
                );
            }

            return data;
        },
    });
}

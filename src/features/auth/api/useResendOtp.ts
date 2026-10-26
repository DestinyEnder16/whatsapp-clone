import { api } from '@/services/api/client';
import type { components } from '@/services/api/schema';
import { useMutation } from '@tanstack/react-query';

export function useResendOtp() {
  return useMutation({
    mutationFn: async (payload: components['schemas']['ResendOtpDto']) => {
      const { data, error } = await api.POST('/v1/auth/otp/resend', { body: payload });
      if (error) throw new Error((error as { message?: string }).message || 'Failed to resend OTP');
      return data;
    },
  });
}
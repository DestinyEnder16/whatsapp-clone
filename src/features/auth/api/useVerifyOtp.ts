// src/features/auth/api/useVerifyOtp.ts
import { api } from "@/services/api/client";
import type { components } from "@/services/api/schema";
import { useMutation } from "@tanstack/react-query";

// Type extraction directly from schema
export type VerifyOtpInput = components["schemas"]["VerifyOtpDto"]; // { challengeId: string, code: string, device?: ... }
export type AuthResponse = components["schemas"]["AuthResponseDto"]; // { accessToken: string, refreshToken: string, user: ... }

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async (payload: VerifyOtpInput): Promise<AuthResponse> => {
      const { data, error } = await api.POST("/v1/auth/otp/verify", {
        body: payload,
      });

      if (error) {
        throw new Error(
          (error as { message?: string }).message || "Verification failed",
        );
      }

      return data;
    },
  });
}

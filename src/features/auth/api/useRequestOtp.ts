// src/features/auth/api/useRequestOtp.ts
import { api } from "@/services/api/client";
import type { components } from "@/services/api/schema";
import { useMutation } from "@tanstack/react-query";

// You can extract the types directly from the schema
// IMPORTANT: Type Extraction
export type RequestOtpInput = components["schemas"]["RequestOtpDto"]; // { phoneNumber: string }
export type OtpChallenge = components["schemas"]["OtpChallengeResponseDto"]; // { challengeId: string, phoneNumberMasked: string, resendInSeconds: number }

export function useRequestOtp() {
  // useMutation is used for actions and side-effects.
  return useMutation({
    mutationFn: async (payload: RequestOtpInput): Promise<OtpChallenge> => {
      // api.POST autocompletes '/v1/auth/otp/request' and checks the body format!
      const { data, error } = await api.POST("/v1/auth/otp/request", {
        body: payload,
      });

      if (error) {
        // Handle backend validation/error message
        throw new Error(
          (error as { message?: string }).message || "Failed to send OTP",
        );
      }

      return data;
    },
  });
}

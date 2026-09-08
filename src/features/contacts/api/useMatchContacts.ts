import { useAuthStore } from "@/core/store/useAuthStore";
import { api } from "@/services/api/client";
import type { components } from "@/services/api/schema";
import { useMutation } from "@tanstack/react-query";

export type MatchContactsDto = components["schemas"]["MatchContactsDto"];
export type ContactMatchesResponseDto =
  components["schemas"]["ContactMatchesResponseDto"];
export type ContactMatchDto = components["schemas"]["ContactMatchDto"];

const MAX_BATCH_SIZE = 100;

/**
 * Sends a batch of numbers to the backend. If the backend returns `invalidIndices`,
 * automatically strips those indices and retries the batch so the sync succeeds seamlessly.
 */
async function sendBatchWithRetry(
  batch: string[],
  accessToken: string | null,
  batchIndex: number
): Promise<ContactMatchDto[]> {
  let currentBatch = [...batch];
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(
      `[useMatchContacts] Batch ${batchIndex + 1} (Attempt ${attempt}): Sending ${currentBatch.length} numbers`
    );

    const { data, error } = await api.POST("/v1/contacts/match", {
      body: { phoneNumbers: currentBatch },
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : undefined,
    });

    if (!error && data?.matches) {
      console.log(
        `[useMatchContacts] Batch ${batchIndex + 1} succeeded! Matched ${data.matches.length} contacts.`
      );
      return data.matches;
    }

    if (error) {
      const invalidIndices: number[] | undefined = (error as any)?.details
        ?.invalidIndices;

      // Self-healing: if the server tells us which indices were invalid, remove them and retry
      if (Array.isArray(invalidIndices) && invalidIndices.length > 0) {
        const rejectedNumbers = invalidIndices.map((idx) => currentBatch[idx]);
        console.warn(
          `[useMatchContacts] Server flagged ${invalidIndices.length} invalid numbers:`,
          rejectedNumbers
        );

        currentBatch = currentBatch.filter(
          (_, idx) => !invalidIndices.includes(idx)
        );

        if (currentBatch.length === 0) {
          console.warn(
            `[useMatchContacts] No numbers remaining in batch ${batchIndex + 1} after filtering invalid numbers.`
          );
          return [];
        }

        // Loop continues to attempt with filtered batch
        continue;
      }

      console.error(
        `[useMatchContacts] Batch ${batchIndex + 1} failed with error:`,
        JSON.stringify(error, null, 2)
      );

      const errorMessage =
        (error as any)?.message ||
        (error as any)?.error ||
        "Failed to match contacts";
      throw new Error(errorMessage);
    }
  }

  return [];
}

export function useMatchContacts() {
  return useMutation({
    mutationFn: async (
      payload: MatchContactsDto
    ): Promise<ContactMatchesResponseDto> => {
      const accessToken = useAuthStore.getState().accessToken;
      const allNumbers = payload.phoneNumbers || [];

      if (allNumbers.length === 0) {
        return { matches: [] };
      }

      console.log(
        `[useMatchContacts] Matching ${allNumbers.length} numbers across batches of ${MAX_BATCH_SIZE}...`
      );

      const allMatches: ContactMatchDto[] = [];

      // Chunk numbers into batches of at most 100 (as required by maxItems: 100 in API schema)
      for (let i = 0; i < allNumbers.length; i += MAX_BATCH_SIZE) {
        const batch = allNumbers.slice(i, i + MAX_BATCH_SIZE);
        const batchIndex = Math.floor(i / MAX_BATCH_SIZE);

        const matches = await sendBatchWithRetry(
          batch,
          accessToken,
          batchIndex
        );

        allMatches.push(...matches);
      }

      console.log(
        `[useMatchContacts] All batches processed. Total matched contacts: ${allMatches.length}`
      );
      return { matches: allMatches };
    },
  });
}

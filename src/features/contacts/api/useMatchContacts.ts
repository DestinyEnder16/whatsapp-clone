import { useAuthStore } from '@/core/store/useAuthStore';
import { getAuthSessionGeneration } from '@/services/api/authSession';
import { api } from '@/services/api/client';
import type { components } from '@/services/api/schema';
import { useMutation } from '@tanstack/react-query';

export type MatchContactsDto = components['schemas']['MatchContactsDto'];
export type ContactMatchesResponseDto =
  components['schemas']['ContactMatchesResponseDto'];
export type ContactMatchDto = components['schemas']['ContactMatchDto'];

/**
 * The backend API schema defines `maxItems: 100` on the `/v1/contacts/match` payload.
 * Any request with >100 phone numbers will be rejected immediately by server-side validation.
 */
const MAX_BATCH_SIZE = 100;
const BATCH_TIMEOUT_MS = 15_000;

function createRequestSignal(parentSignal: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BATCH_TIMEOUT_MS);
  const abort = () => controller.abort();
  parentSignal.addEventListener('abort', abort, { once: true });

  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout);
      parentSignal.removeEventListener('abort', abort);
    },
  };
}

/**
 * Sends a single batch of up to 100 phone numbers to `/v1/contacts/match`.
 *
 * Self-Healing / Fault-Tolerant Retry:
 * When sending phone numbers to the backend, if even a single phone number fails backend validation,
 * some backend APIs return a 400 Bad Request with an `invalidIndices` array (the zero-based indices
 * of the offending phone numbers within that specific batch).
 *
 * Rather than letting one invalid number fail contact synchronization for all 99 other contacts,
 * this function automatically:
 * 1. Catches the error and checks for `invalidIndices`.
 * 2. Filters out the offending phone numbers from `currentBatch`.
 * 3. Immediately retries the batch with the remaining valid numbers (up to `maxRetries = 3`).
 *
 * @param batch - Array of up to 100 normalized E.164 phone numbers
 * @param accessToken - Bearer token for authentication
 * @param batchIndex - Zero-indexed batch number (for logging/debugging)
 * @returns Array of matched contacts returned from the server
 */
async function sendBatchWithRetry(
  batch: string[],
  accessToken: string | null,
  batchIndex: number,
  parentSignal: AbortSignal
): Promise<ContactMatchDto[]> {
  let currentBatch = [...batch];
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(
      `[useMatchContacts] Batch ${batchIndex + 1} (Attempt ${attempt}): Sending ${currentBatch.length} numbers`
    );

    const request = createRequestSignal(parentSignal);
    let data;
    let error;
    try {
      ({ data, error } = await api.POST('/v1/contacts/match', {
        body: { phoneNumbers: currentBatch },
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
        signal: request.signal,
      }));
    } finally {
      request.dispose();
    }

    // Success case: Server returned matched users
    if (!error && data?.matches) {
      console.log(
        `[useMatchContacts] Batch ${batchIndex + 1} succeeded! Matched ${data.matches.length} contacts.`
      );
      return data.matches;
    }

    // Error case: Check if server provided actionable invalid indices
    if (error) {
      const invalidIndices: number[] | undefined = (error as any)?.details
        ?.invalidIndices;

      // If specific invalid numbers were flagged, strip them out and retry
      if (Array.isArray(invalidIndices) && invalidIndices.length > 0) {
        console.warn(
          `[useMatchContacts] Server flagged ${invalidIndices.length} invalid numbers in batch ${batchIndex + 1}`
        );

        // Remove the rejected numbers from the current batch
        currentBatch = currentBatch.filter(
          (_, idx) => !invalidIndices.includes(idx)
        );

        // If no numbers remain after filtering, return empty without crashing
        if (currentBatch.length === 0) {
          console.warn(
            `[useMatchContacts] No numbers remaining in batch ${batchIndex + 1} after filtering invalid numbers.`
          );
          return [];
        }

        // Continue to the next loop iteration (retry attempt with cleaned batch)
        continue;
      }

      // If the error was not an invalid-index validation error, throw to halt or be handled by React Query
      console.error(
        `[useMatchContacts] Batch ${batchIndex + 1} failed (${(error as any)?.status || 'unknown status'})`
      );

      const errorMessage =
        (error as any)?.message ||
        (error as any)?.error ||
        'Failed to match contacts';
      throw new Error(errorMessage);
    }
  }

  return [];
}

/**
 * React Query mutation hook for uploading phone numbers and retrieving matching WhatsApp users.
 *
 * Why this hook is structured this way:
 * 1. **Batching**: Users can have hundreds or thousands of contacts. The backend schema enforces
 *    `maxItems: 100`. This hook automatically slices the total list into chunks of 100, executes
 *    each batch sequentially through `sendBatchWithRetry`, and merges all results.
 * 2. **Authentication**: Automatically attaches the current user's `accessToken` from Zustand.
 * 3. **Mutations vs Queries**: We use `useMutation` rather than `useQuery` because contact syncing
 *    is an on-demand, user-initiated action (clicking "Find Contacts") that sends large payloads.
 */
export function useMatchContacts() {
  return useMutation({
    mutationFn: async (
      payload: MatchContactsDto & {
        signal?: AbortSignal;
        sessionGeneration?: number;
      }
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
      const signal = payload.signal ?? new AbortController().signal;
      const sessionGeneration =
        payload.sessionGeneration ?? getAuthSessionGeneration();

      // Chunk numbers into batches of at most 100 to respect the backend API limit
      for (let i = 0; i < allNumbers.length; i += MAX_BATCH_SIZE) {
        if (
          signal.aborted ||
          sessionGeneration !== getAuthSessionGeneration()
        ) {
          const cancellationError = new Error('Contact sync was cancelled');
          cancellationError.name = 'AbortError';
          throw cancellationError;
        }
        const batch = allNumbers.slice(i, i + MAX_BATCH_SIZE);
        const batchIndex = Math.floor(i / MAX_BATCH_SIZE);

        const matches = await sendBatchWithRetry(
          batch,
          accessToken,
          batchIndex,
          signal
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

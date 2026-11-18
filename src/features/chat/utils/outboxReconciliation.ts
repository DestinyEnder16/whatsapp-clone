// src/features/chat/utils/outboxReconciliation.ts
import { discardUploadOperation } from '@/services/media/uploadMedia';
import { useMessageOutboxStore } from '../store/useMessageOutboxStore';

/**
 * The server has confirmed this message (HTTP success, a socket delivery, or it
 * appeared in loaded history). Whichever of those arrives first, the durable
 * outbox entry (and any upload record it owned) is finished with: leaving it
 * would show a Retry for a message the recipient already has.
 *
 * Safe to call repeatedly and for messages that were never in the outbox.
 */
export function confirmOutboxMessage(
  accountId: string,
  conversationId: string,
  clientMessageId: string
): void {
  const outbox = useMessageOutboxStore.getState();
  const entry =
    outbox.messages[`${accountId}:${conversationId}:${clientMessageId}`];
  if (!entry) return;

  if (entry.upload) {
    discardUploadOperation(accountId, entry.upload.clientUploadId);
  }
  outbox.remove(accountId, conversationId, clientMessageId);
}

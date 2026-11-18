// src/services/navigation/routeGuard.ts
//
// Pure decisions for the root layout, kept out of the component so each case
// (cold/warm entry, signed out, incomplete profile, bad IDs) can be tested.
// Client-side protection only hides screens; the server still authorizes.
import { isValidUuid } from './uuid';

export interface GuardInput {
  hasHydrated: boolean;
  isAuthenticated: boolean;
  profileComplete: boolean;
  /** useSegments() - e.g. ['chat', '<id>'] or ['(tabs)']. */
  segments: readonly string[];
}

export type GuardDecision =
  | { action: 'none' }
  | {
      action: 'redirect';
      to: '/onboarding' | '/profile';
      /** Chat the user was trying to open; keep it for after login/profile. */
      captureConversationId?: string;
    }
  | { action: 'resume-pending' };

const PROTECTED_SEGMENTS = new Set(['(tabs)', 'chat', 'settings', 'pin-setup']);

function chatIdFrom(segments: readonly string[]): string | undefined {
  return segments[0] === 'chat' && isValidUuid(segments[1])
    ? segments[1]
    : undefined;
}

export function decideRouteGuard({
  hasHydrated,
  isAuthenticated,
  profileComplete,
  segments,
}: GuardInput): GuardDecision {
  // Never decide from the empty pre-hydration auth state.
  if (!hasHydrated) return { action: 'none' };

  const first = segments[0];
  const isProtected = first !== undefined && PROTECTED_SEGMENTS.has(first);

  if (!isAuthenticated) {
    return isProtected
      ? {
          action: 'redirect',
          to: '/onboarding',
          captureConversationId: chatIdFrom(segments),
        }
      : { action: 'none' };
  }

  if (!profileComplete) {
    return isProtected
      ? {
          action: 'redirect',
          to: '/profile',
          captureConversationId: chatIdFrom(segments),
        }
      : { action: 'none' };
  }

  // Signed in with a finished profile but sitting on onboarding/auth screens.
  if (first === 'onboarding' || first === '(auth)') {
    return { action: 'resume-pending' };
  }
  return { action: 'none' };
}

/**
 * A link (custom scheme or universal link) to a chat. Returns the conversation
 * ID only when it is a valid UUID, otherwise null (malformed IDs are ignored,
 * never remembered).
 */
export function conversationIdFromPath(
  path: string | null | undefined
): string | null {
  if (!path) return null;
  const match = path.match(/(?:^|\/)chat\/([^/?#]+)/);
  const id = match?.[1];
  return id && isValidUuid(id) ? id : null;
}

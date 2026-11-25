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

  // Signed in with a finished profile but sitting on a signed-out screen.
  // The OTP, profile and photo screens finish the flow themselves (and consume
  // the saved destination when they do), so the guard must not race them: the
  // optional photo step would otherwise be skipped as soon as the name is saved.
  const second = segments[1];
  if (
    first === 'onboarding' ||
    (first === '(auth)' && !(second && SELF_NAVIGATING_AUTH_SCREENS.has(second)))
  ) {
    return { action: 'resume-pending' };
  }
  return { action: 'none' };
}

/** Auth screens that navigate onward on their own once their step is done. */
const SELF_NAVIGATING_AUTH_SCREENS = new Set([
  'verify-otp',
  'profile',
  'upload-photo',
]);

/**
 * May private screens (tabs, chat, settings, pin-setup) be mounted at all?
 * Only after auth is restored, for a signed-in user whose profile is finished.
 * Used for Stack.Protected so they never mount first and redirect later.
 */
export function canMountPrivateScreens({
  hasHydrated,
  isAuthenticated,
  profileComplete,
}: Omit<GuardInput, 'segments'>): boolean {
  return hasHydrated && isAuthenticated && profileComplete;
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

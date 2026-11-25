// Tests for the root route guard decisions (src/services/navigation/routeGuard.ts).
// Checks that nothing is decided before auth has been restored, that a
// signed-out or profile-incomplete user is sent away from private screens
// while the chat they were trying to open (only if its ID is a valid UUID) is
// remembered, that private routes include pin-setup, and that a signed-in user
// on onboarding/auth screens resumes any saved destination. Also checks that
// chat links are parsed safely. Client-side protection only; the server still
// authorizes.
import {
  canMountPrivateScreens,
  conversationIdFromPath,
  decideRouteGuard,
  type GuardInput,
} from '@/services/navigation/routeGuard';

const CHAT_ID = '3f2b8c1e-7d44-4a1e-9b0a-1c2d3e4f5a6b';

const state = (overrides: Partial<GuardInput> = {}): GuardInput => ({
  hasHydrated: true,
  isAuthenticated: false,
  profileComplete: false,
  segments: [],
  ...overrides,
});

describe('before auth has been restored', () => {
  test.each([['(tabs)'], ['chat'], ['settings'], ['onboarding']])(
    'decides nothing on %s',
    (first) => {
      expect(
        decideRouteGuard(state({ hasHydrated: false, segments: [first] })),
      ).toEqual({ action: 'none' });
    },
  );
});

describe('signed out', () => {
  test.each([['(tabs)'], ['settings'], ['pin-setup']])(
    'is sent to onboarding from %s',
    (first) => {
      expect(decideRouteGuard(state({ segments: [first] }))).toEqual({
        action: 'redirect',
        to: '/onboarding',
        captureConversationId: undefined,
      });
    },
  );

  test('remembers the chat that was being opened', () => {
    expect(
      decideRouteGuard(state({ segments: ['chat', CHAT_ID] })),
    ).toEqual({
      action: 'redirect',
      to: '/onboarding',
      captureConversationId: CHAT_ID,
    });
  });

  test.each([
    ['a malformed id', ['chat', 'not-a-uuid']],
    ['a whitespace id', ['chat', '   ']],
    ['no id', ['chat']],
  ])('does not remember %s', (_label, segments) => {
    expect(decideRouteGuard(state({ segments }))).toEqual({
      action: 'redirect',
      to: '/onboarding',
      captureConversationId: undefined,
    });
  });

  test.each([['onboarding'], ['(auth)'], ['index']])(
    'may stay on public screen %s',
    (first) => {
      expect(decideRouteGuard(state({ segments: [first] }))).toEqual({
        action: 'none',
      });
    },
  );
});

describe('signed in with an incomplete profile', () => {
  const incomplete = (segments: string[]) =>
    state({ isAuthenticated: true, profileComplete: false, segments });

  test('is sent to finish the profile from private screens', () => {
    expect(decideRouteGuard(incomplete(['(tabs)']))).toEqual({
      action: 'redirect',
      to: '/profile',
      captureConversationId: undefined,
    });
  });

  test('keeps the chat that was being opened for after the profile is done', () => {
    expect(decideRouteGuard(incomplete(['chat', CHAT_ID]))).toEqual({
      action: 'redirect',
      to: '/profile',
      captureConversationId: CHAT_ID,
    });
  });

  test('may stay on the profile and auth screens', () => {
    expect(decideRouteGuard(incomplete(['(auth)']))).toEqual({ action: 'none' });
  });
});

describe('signed in with a complete profile', () => {
  const ready = (segments: string[]) =>
    state({ isAuthenticated: true, profileComplete: true, segments });

  test.each([['onboarding'], ['(auth)']])(
    'leaving %s resumes any saved destination',
    (first) => {
      expect(decideRouteGuard(ready([first]))).toEqual({
        action: 'resume-pending',
      });
    },
  );

  test('leaving the phone-number screen also resumes the saved destination', () => {
    expect(decideRouteGuard(ready(['(auth)', 'phone']))).toEqual({
      action: 'resume-pending',
    });
  });

  // These screens move on (and consume the saved destination) themselves. If
  // the guard also jumped away, saving the name would skip the optional photo
  // step, and the saved chat could be consumed before the flow finished.
  test.each([['verify-otp'], ['profile'], ['upload-photo']])(
    'does not race the self-navigating (auth)/%s screen',
    (second) => {
      expect(decideRouteGuard(ready(['(auth)', second]))).toEqual({
        action: 'none',
      });
    },
  );

  test.each([['(tabs)'], ['chat'], ['settings'], ['pin-setup']])(
    'stays on private screen %s',
    (first) => {
      expect(decideRouteGuard(ready([first, CHAT_ID]))).toEqual({
        action: 'none',
      });
    },
  );
});

describe('canMountPrivateScreens (Stack.Protected)', () => {
  test('only a restored, signed-in user with a finished profile gets private screens', () => {
    expect(
      canMountPrivateScreens({ hasHydrated: true, isAuthenticated: true, profileComplete: true }),
    ).toBe(true);
  });

  test.each([
    ['before auth is restored', { hasHydrated: false, isAuthenticated: true, profileComplete: true }],
    ['signed out', { hasHydrated: true, isAuthenticated: false, profileComplete: false }],
    ['profile not finished', { hasHydrated: true, isAuthenticated: true, profileComplete: false }],
  ])('none %s', (_label, input) => {
    expect(canMountPrivateScreens(input)).toBe(false);
  });
});

describe('conversationIdFromPath', () => {
  test.each([
    [`chat/${CHAT_ID}`, CHAT_ID],
    [`/chat/${CHAT_ID}`, CHAT_ID],
    [`chat/${CHAT_ID}?name=Sam`, CHAT_ID],
    [`app/chat/${CHAT_ID}`, CHAT_ID],
  ])('reads the id from %s', (path, expected) => {
    expect(conversationIdFromPath(path)).toBe(expected);
  });

  test.each([
    [null],
    [undefined],
    [''],
    ['chat/'],
    ['chat/not-a-uuid'],
    ['chat/   '],
    [`settings/${CHAT_ID}`],
    [`chat/${CHAT_ID}-extra`],
  ])('ignores %p', (path) => {
    expect(conversationIdFromPath(path)).toBeNull();
  });
});

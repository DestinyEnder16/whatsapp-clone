// Tests for the session-ownership helpers (src/core/session/sessionOwner.ts).
// Checks that work captured under one session stops being "current" after a
// logout, an account switch, or a logout/login as the SAME account (account id
// alone would wrongly pass that last case), and that the session's abort signal
// fires when the session ends. Storage and push are mocked; the real auth
// store and session counter are used.
import {
  assertSessionOwnerCurrent,
  captureSessionOwner,
  isSessionChangedError,
  isSessionEndedError,
  isSessionOwnerCurrent,
  linkAbortSignals,
  SessionChangedError,
  throwIfAborted,
} from '@/core/session/sessionOwner';
import { useAuthStore } from '@/core/store/useAuthStore';
import { clearPersisted } from '../test-utils/mmkvMock';

jest.mock('@/core/storage/mmkv', () => require('../test-utils/mmkvMock'));
jest.mock('@/services/notifications', () => ({
  registerForPushNotificationsAsync: jest.fn(() => Promise.resolve()),
  unregisterPushDeviceAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/services/api/authSession', () => ({
  ...jest.requireActual('@/services/api/authSession'),
  revokeAuthSession: jest.fn(() => Promise.resolve()),
}));

const user = (id: string) => ({ id, phoneNumber: '+2348012345678' }) as any;
const signIn = (id: string) =>
  useAuthStore.getState().setAuth(`access-${id}`, `refresh-${id}`, user(id));

beforeEach(() => {
  clearPersisted();
  useAuthStore.getState().logout();
});

describe('captureSessionOwner / isSessionOwnerCurrent', () => {
  test('is current while nothing changes', () => {
    signIn('A');
    const owner = captureSessionOwner();
    expect(owner.accountId).toBe('A');
    expect(isSessionOwnerCurrent(owner)).toBe(true);
    expect(() => assertSessionOwnerCurrent(owner)).not.toThrow();
  });

  test('is not current after logout', () => {
    signIn('A');
    const owner = captureSessionOwner();
    useAuthStore.getState().logout();
    expect(isSessionOwnerCurrent(owner)).toBe(false);
  });

  test('is not current after switching to a different account', () => {
    signIn('A');
    const owner = captureSessionOwner();
    useAuthStore.getState().logout();
    signIn('B');
    expect(isSessionOwnerCurrent(owner)).toBe(false);
  });

  test('is not current after logout and login as the SAME account', () => {
    signIn('A');
    const owner = captureSessionOwner();
    useAuthStore.getState().logout();
    signIn('A'); // same account id: only the generation tells them apart
    expect(useAuthStore.getState().user?.id).toBe(owner.accountId);
    expect(isSessionOwnerCurrent(owner)).toBe(false);
  });

  test('signing in as a different account without logging out also ends the old session', () => {
    signIn('A');
    const owner = captureSessionOwner();
    signIn('B');
    expect(isSessionOwnerCurrent(owner)).toBe(false);
  });

  test('a token refresh for the same account does not end the session', () => {
    signIn('A');
    const owner = captureSessionOwner();
    signIn('A'); // refresh rotates tokens but keeps the account
    expect(isSessionOwnerCurrent(owner)).toBe(true);
  });

  test('assert throws SessionChangedError for an ended session', () => {
    signIn('A');
    const owner = captureSessionOwner();
    useAuthStore.getState().logout();
    expect(() => assertSessionOwnerCurrent(owner)).toThrow(SessionChangedError);
  });

  test('a signed-out owner has no account', () => {
    expect(captureSessionOwner().accountId).toBeNull();
  });
});

describe('session abort signal', () => {
  test('aborts when the session ends, so transfers stop at the transport', () => {
    signIn('A');
    const owner = captureSessionOwner();
    expect(owner.signal.aborted).toBe(false);
    useAuthStore.getState().logout();
    expect(owner.signal.aborted).toBe(true);
  });

  test('the next session gets a fresh, unaborted signal', () => {
    signIn('A');
    useAuthStore.getState().logout();
    signIn('B');
    expect(captureSessionOwner().signal.aborted).toBe(false);
  });
});

describe('linkAbortSignals / throwIfAborted', () => {
  test('aborts when any linked signal aborts', () => {
    const a = new AbortController();
    const b = new AbortController();
    const linked = linkAbortSignals(a.signal, b.signal);
    expect(linked.aborted).toBe(false);
    b.abort();
    expect(linked.aborted).toBe(true);
  });

  test('is already aborted if an input already was', () => {
    const a = new AbortController();
    a.abort();
    expect(linkAbortSignals(a.signal, undefined).aborted).toBe(true);
  });

  test('ignores undefined inputs', () => {
    expect(linkAbortSignals(undefined, undefined).aborted).toBe(false);
  });

  test('throwIfAborted throws only for an aborted signal', () => {
    const controller = new AbortController();
    expect(() => throwIfAborted(controller.signal)).not.toThrow();
    expect(() => throwIfAborted(undefined)).not.toThrow();
    controller.abort();
    expect(() => throwIfAborted(controller.signal)).toThrow(
      SessionChangedError,
    );
  });
});

describe('error classification', () => {
  test('recognises errors that mean "the session ended"', () => {
    expect(isSessionChangedError(new SessionChangedError())).toBe(true);
    expect(isSessionEndedError(new SessionChangedError())).toBe(true);
    const abort = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    expect(isSessionEndedError(abort)).toBe(true);
  });

  test('does not treat ordinary failures as session-ended', () => {
    expect(isSessionEndedError(new Error('Offline'))).toBe(false);
    expect(isSessionEndedError(null)).toBe(false);
    expect(isSessionEndedError(undefined)).toBe(false);
  });
});

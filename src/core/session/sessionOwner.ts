// src/core/session/sessionOwner.ts
//
// Ownership of asynchronous work.
//
// Any operation that starts while account A is signed in and finishes after the
// session ended (logout, or logout followed by a login - even as the same
// account) must not write to, or act as, whoever is signed in by then.
//
// The pattern is:
//   1. capture an owner when the work STARTS (before the first await);
//   2. after every await, and immediately before every store/cache write or
//      authenticated step, call assertSessionOwnerCurrent(owner).
//
// An owner is the account id plus the session generation. Comparing the account
// id alone is not enough: logging out and back in as the same account must
// still invalidate work that began in the old session, which the generation
// (bumped on every logout and account switch) provides.
import { useAuthStore } from '@/core/store/useAuthStore';
import {
  getAuthSessionGeneration,
  getAuthSessionSignal,
} from '@/services/api/authSession';

export interface SessionOwner {
  /** Signed-in account when the work started, or null when signed out. */
  accountId: string | null;
  /** Session generation when the work started. */
  generation: number;
  /** Aborts when that session ends. Pass it to fetch / the API client. */
  signal: AbortSignal;
}

/** Thrown when work belonging to an ended session tries to continue. */
export class SessionChangedError extends Error {
  constructor() {
    super('The session changed while this operation was in progress.');
    this.name = 'SessionChangedError';
  }
}

export function isSessionChangedError(
  error: unknown
): error is SessionChangedError {
  return error instanceof SessionChangedError;
}

/** Capture who owns the work that is about to start. Call before any await. */
export function captureSessionOwner(): SessionOwner {
  return {
    accountId: useAuthStore.getState().user?.id ?? null,
    generation: getAuthSessionGeneration(),
    signal: getAuthSessionSignal(),
  };
}

/** True while the session that started the work is still the current one. */
export function isSessionOwnerCurrent(owner: SessionOwner): boolean {
  return (
    owner.generation === getAuthSessionGeneration() &&
    owner.accountId === (useAuthStore.getState().user?.id ?? null)
  );
}

/** Throw SessionChangedError unless the owner's session is still current. */
export function assertSessionOwnerCurrent(owner: SessionOwner): void {
  if (!isSessionOwnerCurrent(owner)) {
    throw new SessionChangedError();
  }
}

/**
 * An AbortSignal that aborts when ANY of the given signals does. (React Native's
 * AbortSignal has no `any()` / `throwIfAborted()`, so this is done by hand.)
 */
export function linkAbortSignals(
  ...signals: (AbortSignal | undefined)[]
): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}

/** Throw if the signal has been aborted. */
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new SessionChangedError();
  }
}

/**
 * True for the errors produced when work is stopped because its session ended
 * (our SessionChangedError, or a fetch aborted by the session signal). These
 * are expected after logout and must not be shown to whoever signs in next.
 */
export function isSessionEndedError(error: unknown): boolean {
  return (
    isSessionChangedError(error) ||
    (error as { name?: string } | null)?.name === 'AbortError'
  );
}

let authSessionGeneration = 0;
// Aborted when the session ends, so in-flight requests and uploads stop at the
// transport instead of only being ignored when they finish.
let authSessionAbort = new AbortController();

export function invalidateAuthSession() {
  authSessionGeneration += 1;
  authSessionAbort.abort();
  authSessionAbort = new AbortController();
}

/** Aborts when the current session ends (logout or account switch). */
export function getAuthSessionSignal(): AbortSignal {
  return authSessionAbort.signal;
}

export function getAuthSessionGeneration() {
  return authSessionGeneration;
}

export async function revokeAuthSession(refreshToken: string | null) {
  if (!refreshToken) return;
  await fetch(`${process.env.EXPO_PUBLIC_API_URL}/v1/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
}

import {
  assertSessionOwnerCurrent,
  captureSessionOwner,
  type SessionOwner,
} from '@/core/session/sessionOwner';
import { useAuthStore } from '@/core/store/useAuthStore';
import createClient, { type Middleware } from 'openapi-fetch';
import { getAuthSessionGeneration } from './authSession';
import { paths } from './schema';

export const api = createClient<paths>({
  baseUrl: process.env.EXPO_PUBLIC_API_URL,
});

/**
 * Safely extracts the expiration timestamp (in ms) from a JWT with correct base64 padding.
 */
function getJwtExpiration(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const decoded = atob(base64);
    const parsed = JSON.parse(decoded);
    return typeof parsed.exp === 'number' ? parsed.exp * 1000 : null;
  } catch (err) {
    console.warn('Failed to parse JWT exp:', err);
    return null;
  }
}

// Holds any in-flight token refresh promise to prevent duplicate concurrent refresh requests
let refreshPromise: Promise<string | null> | null = null;
let refreshPromiseGeneration: number | null = null;
/**
 * Retrieves a valid access token. If the current token is expired (or about to expire
 * in less than 30 seconds), it automatically rotates tokens using the refresh token.
 *
 * When `owner` is given, the caller is acting on behalf of that session: if the
 * session has since ended this throws SessionChangedError instead of handing
 * the caller whichever account's token happens to be current.
 */
export async function getValidAccessToken(
  forceRefresh = false,
  owner?: SessionOwner
): Promise<string | null> {
  if (owner?.accountId) assertSessionOwnerCurrent(owner);

  const { accessToken, refreshToken, logout, setRefreshStatus } =
    useAuthStore.getState();

  if (!accessToken && !refreshToken) {
    return null;
  }

  // 1. If not forcing refresh, check if current accessToken is still valid (with 30s buffer)
  if (!forceRefresh && accessToken) {
    const expTime = getJwtExpiration(accessToken);
    if (expTime && Date.now() < expTime - 30_000) {
      return accessToken;
    }
  }

  // 2. Token is expired or missing; check if we have a refresh token
  if (!refreshToken) {
    logout();
    return null;
  }

  // 3. Deduplicate concurrent refresh calls
  const currentGeneration = getAuthSessionGeneration();
  if (refreshPromise && refreshPromiseGeneration === currentGeneration) {
    return refreshPromise;
  }

  const requestGeneration = currentGeneration;
  refreshPromiseGeneration = requestGeneration;
  refreshPromise = (async () => {
    setRefreshStatus('retrying');
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/v1/auth/refresh`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }
      );

      if (!res.ok) {
        const isCurrentRequest =
          requestGeneration === getAuthSessionGeneration() &&
          useAuthStore.getState().refreshToken === refreshToken;
        if (isCurrentRequest) {
          if (res.status === 401 || res.status === 403) {
            logout();
          } else {
            setRefreshStatus('recoverable-error');
          }
        }
        return null;
      }

      const data = await res.json();
      // Update global Zustand store and persisted AsyncStorage
      const currentAuth = useAuthStore.getState();
      if (
        requestGeneration !== getAuthSessionGeneration() ||
        currentAuth.refreshToken !== refreshToken
      ) {
        return null;
      }
      useAuthStore
        .getState()
        .setAuth(data.accessToken, data.refreshToken, data.user);
      return data.accessToken as string;
    } catch (err) {
      console.error('Error refreshing access token:', err);
      if (requestGeneration === getAuthSessionGeneration())
        setRefreshStatus('recoverable-error');
      return null;
    } finally {
      if (refreshPromiseGeneration === requestGeneration) {
        refreshPromise = null;
        refreshPromiseGeneration = null;
      }
    }
  })();

  return refreshPromise;
}

// Each request remembers the session that started it, so a slow request (or its
// 401 refresh-and-replay) can never be completed on behalf of a different
// account. Entries are removed when the request settles.
const requestOwners = new Map<string, SessionOwner>();

/** Stale authenticated work stops here; signed-out requests (OTP) are exempt. */
function assertRequestOwnerCurrent(owner: SessionOwner | undefined) {
  if (owner?.accountId) assertSessionOwnerCurrent(owner);
}

const authMiddleware: Middleware = {
  // 1. Before sending: attach a valid access token (refreshes proactively if expired)
  async onRequest({ request, schemaPath, id }) {
    if (schemaPath === '/v1/auth/refresh') {
      return;
    }

    // Capture ownership BEFORE token resolution (which can await a refresh).
    const owner = captureSessionOwner();
    requestOwners.set(id, owner);
    try {
      const token = await getValidAccessToken(false, owner);
      // The session may have ended while the token was resolved or refreshed.
      assertRequestOwnerCurrent(owner);
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`);
      }
    } catch (error) {
      requestOwners.delete(id);
      throw error;
    }
  },

  // 2. After receiving: if server returned 401, rotate the token and replay once,
  //    but only on behalf of the session that sent the request.
  async onResponse({ request, response, schemaPath, id }) {
    const owner = requestOwners.get(id);
    requestOwners.delete(id);

    // Before consuming the result (or refreshing for a 401), make sure this
    // response still belongs to the current session.
    assertRequestOwnerCurrent(owner);

    if (response.status === 401 && schemaPath !== '/v1/auth/refresh') {
      if (request.headers.get('x-auth-retried') === 'true') return;
      // A request sent while signed out carried no token, so a 401 is the
      // server's real answer (e.g. a wrong OTP). Never "repair" it by
      // refreshing and replaying it as whoever has signed in since.
      if (!owner?.accountId) return;
      const token = await getValidAccessToken(true, owner);
      // The refresh can outlive the session: re-check before replaying.
      assertRequestOwnerCurrent(owner);
      if (token) {
        let retried: Response;
        try {
          const retryRequest = request.clone();
          retryRequest.headers.set('Authorization', `Bearer ${token}`);
          retryRequest.headers.set('x-auth-retried', 'true');
          retried = await fetch(retryRequest);
        } catch {
          return response;
        }
        // And again before the replayed result is consumed.
        assertRequestOwnerCurrent(owner);
        return retried;
      }
    }
    // Return undefined so openapi-fetch does not fail the React Native Hermes `instanceof Response` check
  },

  // 3. Transport failures never reach onResponse; do not leak the owner entry.
  onError({ id }) {
    requestOwners.delete(id);
  },
};

api.use(authMiddleware);

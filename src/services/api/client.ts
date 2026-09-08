import createClient, { type Middleware } from 'openapi-fetch';
import { paths } from './schema';
import { useAuthStore } from '@/core/store/useAuthStore';

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

/**
 * Retrieves a valid access token. If the current token is expired (or about to expire
 * in less than 30 seconds), it automatically rotates tokens using the refresh token.
 */
export async function getValidAccessToken(forceRefresh = false): Promise<string | null> {
  const { accessToken, refreshToken, logout } = useAuthStore.getState();

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
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        logout();
        return null;
      }

      const data = await res.json();
      // Update global Zustand store and persisted AsyncStorage
      useAuthStore.getState().setAuth(data.accessToken, data.refreshToken, data.user);
      return data.accessToken as string;
    } catch (err) {
      console.error('Error refreshing access token:', err);
      logout();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

const authMiddleware: Middleware = {
  // 1. Before sending: attach a valid access token (refreshes proactively if expired)
  async onRequest({ request, schemaPath }) {
    if (schemaPath === '/v1/auth/refresh') {
      return;
    }

    const token = await getValidAccessToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
  },

  // 2. After receiving: if server returned 401, trigger background rotation for subsequent calls
  async onResponse({ response, schemaPath }) {
    if (response.status === 401 && schemaPath !== '/v1/auth/refresh') {
      await getValidAccessToken(true);
    }
    // Return undefined so openapi-fetch does not fail the React Native Hermes `instanceof Response` check
  },
};

api.use(authMiddleware);
let authSessionGeneration = 0;

export function invalidateAuthSession() {
  authSessionGeneration += 1;
}

export function getAuthSessionGeneration() {
  return authSessionGeneration;
}

export async function revokeAuthSession(refreshToken: string | null) {
  if (!refreshToken) return;
  await fetch(`${process.env.EXPO_PUBLIC_API_URL}/v1/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
}
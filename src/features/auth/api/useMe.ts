// src/features/auth/api/useMe.ts
import { accountQueryKeys } from '@/core/lib/accountQuery';
import {
  assertSessionOwnerCurrent,
  captureSessionOwner,
  linkAbortSignals,
  SessionChangedError,
} from '@/core/session/sessionOwner';
import { useAuthStore } from '@/core/store/useAuthStore';
import { api } from '@/services/api/client';
import { useQuery } from '@tanstack/react-query';

export function useMe() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const accountId = useAuthStore((state) => state.user?.id);
  const setUser = useAuthStore((state) => state.setUser);

  return useQuery({
    queryKey: accountId
      ? accountQueryKeys.me(accountId)
      : ['account', 'none', 'me'],
    queryFn: async ({ signal }) => {
      // Who is this fetch for? Captured before the request starts.
      const owner = captureSessionOwner();
      if (owner.accountId !== accountId) throw new SessionChangedError();

      // The API middleware attaches the current token for this owner; the
      // cancellation signal lets logout abort the transfer itself.
      const { data, error } = await api.GET('/v1/me', {
        signal: linkAbortSignals(owner.signal, signal),
      });

      // The query key isolates the cache, but this store write is a separate
      // side effect: validate ownership immediately before it.
      assertSessionOwnerCurrent(owner);
      if (error) throw new Error('Failed to load profile');

      // Keep Zustand in sync with latest backend data
      setUser(data);
      return data;
    },
    enabled: !!accessToken && !!accountId,
  });
}

// src/features/chat/api/useSearchUsers.ts
import { accountQueryKeys } from '@/core/lib/accountQuery';
import { useAuthStore } from '@/core/store/useAuthStore';
import { api } from '@/services/api/client';
import type { components } from '@/services/api/schema';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export type PublicDiscoveryUserDto =
  components['schemas']['PublicDiscoveryUserDto'];
export type UserSearchResponseDto =
  components['schemas']['UserSearchResponseDto'];

/**
 * Query hook to search users by display name via GET /v1/users/search.
 * Only triggers if query string is at least 3 characters long.
 */
export function useSearchUsers(query: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accountId = useAuthStore((s) => s.user?.id);
  const trimmed = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState(trimmed);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(trimmed), 300);
    return () => clearTimeout(timer);
  }, [trimmed]);

  return useQuery({
    queryKey: accountId
      ? accountQueryKeys.userSearch(accountId, debouncedQuery)
      : ['account', 'none', 'users', 'search', debouncedQuery],
    queryFn: async ({ signal }) => {
      const { data, error } = await api.GET('/v1/users/search', {
        params: {
          query: {
            q: trimmed,
            limit: 20,
          },
        },
        signal,
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to search users');
      }

      return data as UserSearchResponseDto;
    },
    enabled: isAuthenticated && !!accountId && debouncedQuery.length >= 3,
    staleTime: 1000 * 60, // 1 minute
  });
}

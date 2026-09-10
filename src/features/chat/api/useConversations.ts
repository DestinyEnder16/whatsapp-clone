import { useAuthStore } from '@/core/store/useAuthStore';
import { api } from '@/services/api/client';
import { useQuery } from '@tanstack/react-query';
export function useConversations() {
  const isAuthenticated = useAuthStore((store) => store.isAuthenticated);

  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      // Authorization header and automatic token refresh are handled globally by api middleware
      const { data, error } = await api.GET('/v1/conversations');

      if (error) {
        throw new Error(
          (error as any)?.message || 'Failed to fetch conversations'
        );
      }
      return data;
    },
    // Only fire this query when the user is authenticated (prevents firing on cold start before login)
    enabled: isAuthenticated,
  });
}

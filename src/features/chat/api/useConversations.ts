import { useAuthStore } from "@/core/store/useAuthStore";
import { api } from "@/services/api/client";
import { useQuery } from "@tanstack/react-query";

export function useConversations() {
  const accessToken = useAuthStore((store) => store.accessToken);

  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/conversations", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        throw new Error(
          (error as any)?.message || "Failed to fetch conversations",
        );
      }
      return data;
    },
    enabled: !!accessToken, // NOTE: why do we need to set this to false?
  });
}

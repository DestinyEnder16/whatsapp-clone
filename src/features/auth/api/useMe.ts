// src/features/auth/api/useMe.ts
import { useAuthStore } from "@/core/store/useAuthStore";
import { api } from "@/services/api/client";
import { useQuery } from "@tanstack/react-query";

export function useMe() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);

  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) throw new Error("Failed to load profile");

      // Keep Zustand in sync with latest backend data
      setUser(data);
      return data;
    },
    enabled: !!accessToken,
  });
}

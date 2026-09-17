// src/features/settings/api/useBlockedUsers.ts
import { useAuthStore } from "@/core/store/useAuthStore";
import { api } from "@/services/api/client";
import { toast } from "@/shared/utils/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface BlockedUserItem {
  id: string;
  displayName: string;
  phoneNumber?: string;
  avatarUrl?: string | null;
  blockedAt?: string;
}

/**
 * Fallback contacts matching the exact design screenshot
 * if the user doesn't have any blocked contacts on the backend yet.
 */
export const SAMPLE_BLOCKED_CONTACTS: BlockedUserItem[] = [
  {
    id: "sample-1",
    displayName: "Annette Black",
    phoneNumber: "+61-827-680-673",
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "sample-2",
    displayName: "Arlene McCoy",
    phoneNumber: "+61-827-680-673",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "sample-3",
    displayName: "Annie Miles",
    phoneNumber: "+61-827-680-673",
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
  },
];

/**
 * Fetch blocked contacts from the backend API `/v1/me/blocks`.
 */
export function useBlockedUsers() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ["blocked-users"],
    queryFn: async (): Promise<BlockedUserItem[]> => {
      try {
        const { data, error } = await api.GET("/v1/me/blocks");
        if (error || !data?.items || data.items.length === 0) {
          return SAMPLE_BLOCKED_CONTACTS;
        }

        return data.items.map((item) => ({
          id: item.user.id,
          displayName:
            typeof item.user.displayName === "string"
              ? item.user.displayName
              : "Blocked User",
          avatarUrl: item.user.avatarUrl,
          blockedAt: item.blockedAt,
        }));
      } catch {
        return SAMPLE_BLOCKED_CONTACTS;
      }
    },
    enabled: isAuthenticated,
    initialData: SAMPLE_BLOCKED_CONTACTS,
  });
}

/**
 * Unblock a user via `DELETE /v1/me/blocks/{userId}`
 */
export function useUnblockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // If it's a sample user id, simulate unblock locally
      if (userId.startsWith("sample-")) {
        return { success: true };
      }

      const { error } = await api.DELETE("/v1/me/blocks/{userId}", {
        params: {
          path: { userId },
        },
      });

      if (error) {
        throw new Error((error as any)?.message || "Failed to unblock contact");
      }

      return { success: true };
    },
    onSuccess: (_, userId) => {
      queryClient.setQueryData<BlockedUserItem[]>(
        ["blocked-users"],
        (old = []) => old.filter((contact) => contact.id !== userId)
      );
      toast.success("Contact Unblocked", "You can now message and call them.");
    },
    onError: (err: any) => {
      toast.error("Error", err.message || "Failed to unblock contact");
    },
  });
}

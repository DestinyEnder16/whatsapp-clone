// src/features/settings/api/useManageStorageData.ts
import { useConversations } from "@/features/chat/api/useConversations";
import { api } from "@/services/api/client";
import { toast } from "@/shared/utils/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

export interface ChatStorageItemData {
  conversationId: string;
  name: string;
  phoneNumber: string;
  avatarUrl?: string | null;
  sizeFormatted: string;
  sizeBytes: number;
}

/**
 * Sample items that match the Manage Storage screenshot
 * if conversations don't have enough data yet.
 */
export const SAMPLE_CHAT_STORAGE: ChatStorageItemData[] = [
  {
    conversationId: "sample-chat-1",
    name: "Esther Howard",
    phoneNumber: "+61-827-680-673",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    sizeFormatted: "120,3 MB",
    sizeBytes: 120.3 * 1024 * 1024,
  },
  {
    conversationId: "sample-chat-2",
    name: "Guy Hawkins",
    phoneNumber: "+61-664-234-133",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    sizeFormatted: "431,6 MB",
    sizeBytes: 431.6 * 1024 * 1024,
  },
  {
    conversationId: "sample-chat-3",
    name: "Robert Fox",
    phoneNumber: "+61-324-773-113",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    sizeFormatted: "183,11 MB",
    sizeBytes: 183.11 * 1024 * 1024,
  },
  {
    conversationId: "sample-chat-4",
    name: "Jacob Jones",
    phoneNumber: "+61-664-121-997",
    avatarUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    sizeFormatted: "623,3 MB",
    sizeBytes: 623.3 * 1024 * 1024,
  },
  {
    conversationId: "sample-chat-5",
    name: "Floyd Miles",
    phoneNumber: "+61-333-444-211",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    sizeFormatted: "325,67 MB",
    sizeBytes: 325.67 * 1024 * 1024,
  },
  {
    conversationId: "sample-chat-6",
    name: "Dianne Russell",
    phoneNumber: "+61-531-996-421",
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    sizeFormatted: "123,3 MB",
    sizeBytes: 123.3 * 1024 * 1024,
  },
];

export function useManageStorageData() {
  const { data: conversations, isLoading } = useConversations();

  const chatList = useMemo<ChatStorageItemData[]>(() => {
    const list: any[] = Array.isArray(conversations)
      ? conversations
      : Array.isArray((conversations as any)?.items)
      ? (conversations as any).items
      : [];

    if (list.length === 0) {
      return SAMPLE_CHAT_STORAGE;
    }

    return list.map((conv: any, idx: number) => {
      const otherParticipant =
        conv && typeof conv === "object" && "otherParticipant" in conv
          ? conv.otherParticipant
          : null;
      const groupName =
        conv && typeof conv === "object" && "name" in conv
          ? (conv.name as string)
          : null;

      const name =
        groupName ||
        (typeof otherParticipant?.displayName === "string"
          ? otherParticipant.displayName
          : "Chat");

      const avatarUrl =
        conv && typeof conv === "object" && "avatarUrl" in conv && conv.avatarUrl
          ? (conv.avatarUrl as string)
          : otherParticipant?.avatarUrl || null;

      // Realistic generated storage consumption per chat
      const sizes = [120.3, 431.6, 183.1, 623.3, 325.7, 123.3];
      const mb = sizes[idx % sizes.length];

      return {
        conversationId: conv?.id || `chat-${idx}`,
        name,
        phoneNumber: "+61-827-680-673",
        avatarUrl,
        sizeFormatted: `${mb.toString().replace(".", ",")} MB`,
        sizeBytes: mb * 1024 * 1024,
      };
    });
  }, [conversations]);

  return {
    chatList,
    isLoading,
  };
}

/**
 * Clear chat history and stored messages for a conversation
 * using `DELETE /v1/conversations/{conversationId}/messages`.
 */
export function useClearChatStorage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (conversationId.startsWith("sample-")) {
        return { success: true };
      }

      const { error } = await api.DELETE(
        "/v1/conversations/{conversationId}/messages",
        {
          params: {
            path: { conversationId },
          },
        }
      );

      if (error) {
        throw new Error(
          (error as any)?.message || "Failed to clear chat storage"
        );
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Storage Cleared", "Messages and media cleared for this chat.");
    },
    onError: (err: any) => {
      toast.error("Error", err.message || "Could not clear storage");
    },
  });
}

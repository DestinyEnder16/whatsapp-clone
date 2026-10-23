// src/core/store/useSocketStore.ts
import { queryClient } from '@/core/lib/queryClient';
import type {
  ClientToServerEvents,
  MessageDto,
  ServerToClientEvents,
  UserPresenceData,
} from '@/core/socket/socketEvents';
import { useAuthStore } from '@/core/store/useAuthStore';
import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';

export interface UserPresenceInfo {
  isOnline: boolean;
  lastActiveAt?: string;
}

export interface TypingInfo {
  userId?: string;
  isTyping: boolean;
  timestamp: number;
}

interface SocketState {
  isConnected: boolean;
  isConnecting: boolean;
  onlineUsers: Record<string, UserPresenceInfo>;
  typingUsers: Record<string, TypingInfo>;

  // Actions
  connect: () => void;
  disconnect: () => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  emitTypingStart: (conversationId: string) => void;
  emitTypingStop: (conversationId: string) => void;
  subscribePresence: (params: {
    userIds?: string[];
    conversationId?: string;
  }) => void;
  setPresence: (
    userId: string,
    isOnline: boolean,
    lastActiveAt?: string
  ) => void;
  setTyping: (
    conversationId: string,
    isTyping: boolean,
    userId?: string
  ) => void;
}

let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null =
  null;
let socketAuthToken: string | null = null;

export function getSocket(): Socket<
  ServerToClientEvents,
  ClientToServerEvents
> | null {
  return socketInstance;
}

const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://chateo-lhuw.onrender.com';

export const useSocketStore = create<SocketState>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  onlineUsers: {},
  typingUsers: {},

  connect: () => {
    const { accessToken, isAuthenticated } = useAuthStore.getState();

    if (!accessToken || !isAuthenticated) {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
      socketAuthToken = null;
      set({ isConnected: false, isConnecting: false });
      return;
    }

    // Keep the existing connection only when it uses the current token.
    if (
      socketInstance &&
      socketAuthToken === accessToken &&
      (socketInstance.connected || get().isConnecting)
    ) {
      set({ isConnected: true, isConnecting: false });
      return;
    }

    set({ isConnecting: true });

    // Clean up existing instance if any
    if (socketInstance) {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
      socketInstance = null;
      socketAuthToken = null;
    }

    // Connect to /chat namespace per tutor specification
    const chatNamespaceUrl = `${DEFAULT_API_URL.replace(/\/+$/, '')}/chat`;

    socketInstance = io(chatNamespaceUrl, {
      auth: {
        token: accessToken,
        authorization: `Bearer ${accessToken}`,
      },
      query: {
        token: accessToken,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    socketAuthToken = accessToken;

    // 1. Connection lifecycle handlers
    socketInstance.on('connect', () => {
      set({ isConnected: true, isConnecting: false });
    });

    socketInstance.on('disconnect', () => {
      set({ isConnected: false, isConnecting: false });
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      set({ isConnected: false, isConnecting: false });
    });

    // 2. Incoming message notification handler (as per tutor guide: "message.created")
    const handleNewMessage = (
      payload: MessageDto | { message: MessageDto }
    ) => {
      const msg: MessageDto = (payload as any)?.message || payload;
      if (!msg?.conversationId || !msg?.id) return;

      // Skip messages sent by the current user (already handled by optimistic updates)
      const currentUserId = useAuthStore.getState().user?.id;
      if (msg.senderId === currentUserId) {
        // Reconcile only the matching optimistic send; never replace another pending message.
        const conversationId = msg.conversationId;
        queryClient.setQueryData(
          ['messages', conversationId],
          (oldData: any) => {
            if (!oldData?.items) return oldData;
            const hasMatchingOptimistic = msg.clientMessageId
              ? oldData.items.some(
                  (item: any) => item.clientMessageId === msg.clientMessageId
                )
              : false;
            const alreadyConfirmed = oldData.items.some(
              (item: any) => item.id === msg.id
            );
            if (alreadyConfirmed) return oldData;
            if (!hasMatchingOptimistic) {
              return { ...oldData, items: [...oldData.items, msg] };
            }
            return {
              ...oldData,
              items: oldData.items.map((item: any) =>
                item.clientMessageId === msg.clientMessageId ? msg : item
              ),
            };
          }
        );
        return;
      }

      const conversationId = msg.conversationId;

      // Update React Query cache for this conversation's messages
      queryClient.setQueryData(['messages', conversationId], (oldData: any) => {
        if (!oldData) {
          return {
            items: [msg],
            pageInfo: { nextCursor: null, hasNextPage: false },
          };
        }

        const existingItems: MessageDto[] = oldData.items || [];

        // Check if message is already in cache
        const alreadyExists = existingItems.some((item) => item.id === msg.id);

        if (alreadyExists) return oldData;

        // Append incoming message at the end (items are stored newest-last after reversal)
        return {
          ...oldData,
          items: [...existingItems, msg],
        };
      });

      // Invalidate conversations list so latest preview and timestamp are updated
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    socketInstance.on('message.created', handleNewMessage);

    // 3. Typing event listeners
    const handleTypingStart = (payload: {
      conversationId: string;
      userId?: string;
    }) => {
      if (!payload?.conversationId) return;
      get().setTyping(payload.conversationId, true, payload.userId);
    };

    const handleTypingStop = (payload: {
      conversationId: string;
      userId?: string;
    }) => {
      if (!payload?.conversationId) return;
      get().setTyping(payload.conversationId, false, payload.userId);
    };

    socketInstance.on('typing.started', handleTypingStart);
    socketInstance.on('typing.start', handleTypingStart);
    socketInstance.on('typing.stopped', handleTypingStop);
    socketInstance.on('typing.stop', handleTypingStop);

    // 4. Presence event listeners
    const handlePresence = (payload: UserPresenceData) => {
      if (!payload?.userId) return;
      get().setPresence(payload.userId, payload.isOnline, payload.lastActiveAt);
    };

    socketInstance.on('presence.updated', handlePresence);
    socketInstance.on('user.status', handlePresence);
    socketInstance.on('user.presence', handlePresence);

    // 5. Read / Delivered receipt event listeners
    const handleReceiptUpdate = (payload: any) => {
      const conversationId = payload?.conversationId;
      if (conversationId) {
        queryClient.invalidateQueries({
          queryKey: ['receipts', conversationId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['receipts'] });
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    socketInstance.on('receipt.updated', handleReceiptUpdate);
    socketInstance.on('receipts.updated', handleReceiptUpdate);
    socketInstance.on('receipt.read', handleReceiptUpdate);
    socketInstance.on('message.read', handleReceiptUpdate);
    socketInstance.on('conversation.read', handleReceiptUpdate);
  },

  disconnect: () => {
    if (socketInstance) {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
      socketInstance = null;
    }
    socketAuthToken = null;
    set({ isConnected: false, isConnecting: false, typingUsers: {} });
  },

  joinConversation: (conversationId: string) => {
    if (!socketInstance?.connected) return;
    socketInstance.emit('conversation.join', { conversationId });
    socketInstance.emit('room.join', { conversationId });
  },

  leaveConversation: (conversationId: string) => {
    if (!socketInstance?.connected) return;
    socketInstance.emit('conversation.leave', { conversationId });
    socketInstance.emit('room.leave', { conversationId });
  },

  emitTypingStart: (conversationId: string) => {
    if (!socketInstance?.connected) return;
    socketInstance.emit('typing.start', { conversationId });
  },

  emitTypingStop: (conversationId: string) => {
    if (!socketInstance?.connected) return;
    socketInstance.emit('typing.stop', { conversationId });
  },

  subscribePresence: (params) => {
    if (!socketInstance?.connected) return;
    socketInstance.emit('presence.subscribe', params, (ack) => {
      if (ack?.ok && ack?.data) {
        if (Array.isArray(ack.data)) {
          ack.data.forEach((p: UserPresenceData) => {
            if (p?.userId) {
              get().setPresence(p.userId, p.isOnline, p.lastActiveAt);
            }
          });
        } else if (ack.data.userId) {
          get().setPresence(
            ack.data.userId,
            ack.data.isOnline,
            ack.data.lastActiveAt
          );
        }
      }
    });
  },

  setPresence: (userId, isOnline, lastActiveAt) => {
    set((state) => ({
      onlineUsers: {
        ...state.onlineUsers,
        [userId]: {
          isOnline,
          lastActiveAt: lastActiveAt || state.onlineUsers[userId]?.lastActiveAt,
        },
      },
    }));
  },

  setTyping: (conversationId, isTyping, userId) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: {
          userId,
          isTyping,
          timestamp: Date.now(),
        },
      },
    }));
  },
}));

// Automatically sync socket lifecycle with auth token changes in useAuthStore
useAuthStore.subscribe((state, prevState) => {
  if (
    state.accessToken !== prevState.accessToken ||
    state.isAuthenticated !== prevState.isAuthenticated
  ) {
    if (state.accessToken && state.isAuthenticated) {
      useSocketStore.getState().connect();
    } else {
      useSocketStore.getState().disconnect();
    }
  }
});

// src/core/socket/socketEvents.ts
import type { components } from "@/services/api/schema";

export type MessageDto = components["schemas"]["MessageResponseDto"];

export interface SocketAckResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface UserPresenceData {
  userId: string;
  isOnline: boolean;
  lastActiveAt?: string;
}

export interface TypingEventPayload {
  conversationId: string;
  userId?: string;
}

/**
 * Events that the client emits to the Socket.IO server
 */
export interface ClientToServerEvents {
  "conversation.join": (
    payload: { conversationId: string },
    ack?: (response: SocketAckResponse) => void
  ) => void;
  "conversation.leave": (
    payload: { conversationId: string },
    ack?: (response: SocketAckResponse) => void
  ) => void;
  "room.join": (
    payload: { conversationId: string },
    ack?: (response: SocketAckResponse) => void
  ) => void;
  "room.leave": (
    payload: { conversationId: string },
    ack?: (response: SocketAckResponse) => void
  ) => void;
  "typing.start": (
    payload: { conversationId: string },
    ack?: (response: SocketAckResponse) => void
  ) => void;
  "typing.stop": (
    payload: { conversationId: string },
    ack?: (response: SocketAckResponse) => void
  ) => void;
  "presence.subscribe": (
    payload: { userIds?: string[]; conversationId?: string },
    ack?: (response: SocketAckResponse<any>) => void
  ) => void;
}

/**
 * Events that the Socket.IO server emits to the client
 */
export interface ServerToClientEvents {
  "message.created": (payload: MessageDto | { message: MessageDto }) => void;
  "typing.started": (payload: TypingEventPayload) => void;
  "typing.stopped": (payload: TypingEventPayload) => void;
  "typing.start": (payload: TypingEventPayload) => void;
  "typing.stop": (payload: TypingEventPayload) => void;
  "presence.updated": (payload: UserPresenceData) => void;
  "user.status": (payload: UserPresenceData) => void;
  "user.presence": (payload: UserPresenceData) => void;
}

# Real-Time Socket.IO & Chat Architecture

This document provides a complete guide to the real-time chat architecture implemented in this application, covering Socket.IO configuration, the REST + Socket split, Zustand-based state management, optimistic UI updates, subtle animations, and presence/typing tracking.

---

## 1. High-Level Architecture: Durability vs. Notification

Chat systems require two distinct communication guarantees:
1. **Durability (Truth)**: Messages, attachments, and receipts must never be silently lost if a connection drops.
2. **Instant Notification (Speed)**: Participants currently in a conversation must see new messages, typing indicators, and presence changes within milliseconds without polling.

Following the ChatMe API design pattern:
- **REST API (`POST /v1/conversations/{id}/messages`)** handles **writes and persistence**. The message is committed to the database first.
- **Socket.IO (`/chat` namespace)** handles **real-time event broadcasts**. Once the database commit succeeds, the server emits `message.created` to all active sockets subscribed to that conversation.
- **REST API (`GET /v1/conversations/{id}/messages`)** handles **history bootstrapping**. When opening a chat room, past messages are fetched through cached HTTP endpoints.

```
       [ Client A ]                              [ Server ]                                [ Client B ]
            │                                         │                                         │
 1. Send    │──── HTTP POST /messages ───────────────>│                                         │
 (Optimistic│     (Durable Write)                     │ 2. Commit to DB                         │
  Bounce Up)│                                         │                                         │
            │<─── 200 OK (Confirmed Message) ────────│                                         │
            │                                         │──── Socket.IO: message.created ────────>│ 3. Receive
            │                                         │     (Instant Broadcast to room)         │ (Bounce In)
```

---

## 2. Why Socket.IO & Where It Lives in the App

### The Dilemma: Context Provider vs. Zustand
In many React apps, sockets are wrapped in a `<SocketProvider>` context at the root of the component tree. However:
- Providers force the entire component tree to re-evaluate when socket status shifts.
- Non-React utilities, middleware, and background listeners cannot access React Context.

**Our Solution: Zustand Socket Store (`src/core/store/useSocketStore.ts`)**
- Manages the singleton Socket.IO instance and reactive connection state.
- Components selectively subscribe only to the slices they care about (e.g. `isOnline`, `isRemoteTyping`).
- Low-level listeners directly update the shared TanStack `queryClient` cache even when the user is on another screen.

### Handshake & Authentication
The Socket.IO client connects to the `/chat` namespace:
- URL: `${EXPO_PUBLIC_API_URL}/chat`
- Transports: `['websocket']` (forces direct native WebSocket transport, skipping HTTP polling overhead)
- Handshake Credentials:
  ```typescript
  auth: {
    token: accessToken,
    authorization: `Bearer ${accessToken}`,
  },
  query: {
    token: accessToken,
  }
  ```
- **Lifecycle Sync**: The store listens to `useAuthStore` state changes. When a user logs in, the socket connects; when the user logs out, the socket disconnects and flushes presence data.

---

## 3. Optimistic Updates (`useSendMessage`)

When a user presses "Send", waiting 200–800ms for a round-trip network response makes messaging feel sluggish.

**How Optimistic Updates Work:**
1. **Cancel In-Flight Queries**: `queryClient.cancelQueries({ queryKey: ['messages', conversationId] })`.
2. **Snapshot Previous State**: In case of a network error, previous messages are saved.
3. **Inject Temporary Message**:
   - A unique client ID (`temp-${Date.now()}` / RFC4122 UUID) is assigned.
   - Status is marked as pending (`isPending: true`, displaying a clock icon).
   - Appended immediately into the local TanStack Query cache.
4. **Trigger Subtle Animation**: The message bubble immediately executes a **Bounce Up** animation.
5. **Reconciliation on Success**:
   - When HTTP 200 OK arrives, the temporary item in the cache is replaced with the authoritative server payload (real `id`, confirmed `createdAt` timestamp, single/double checkmarks).
6. **Rollback on Failure**: If the network request fails, the cache rolls back to the previous snapshot and a toast alert is displayed.

---

## 4. Subtle Native Animations (Reanimated)

Animations run on the native UI thread at 60/120fps using `react-native-reanimated` without external bloat:

### A. Sender "Bounce Up" Animation
When the user sends a message, it enters with a spring bounce moving upward:
```typescript
const enteringAnimation = isMe
  ? BounceInUp.duration(400).springify()
  : BounceInLeft.duration(350).springify();
```

### B. Receiver "Bounce In" Animation
Incoming messages from other participants enter with a subtle `BounceInLeft.duration(350).springify()`.

### C. 3-Dot Typing Bubble (`TypingIndicator.tsx`)
A WhatsApp-style 3-dot bubble rendered at the foot of the chat list with staggered spring translations (`translateY: -4px`) looping infinitely while the remote user is typing.

---

## 5. Typing & Presence Mechanics

### A. Ephemeral Typing Indicator
- **When User Types**: The `TextInput`'s `onChangeText` triggers `handleInputKeystroke()`.
  - Emits `typing.start` to room `{ conversationId }`.
  - Starts a 2.5-second inactivity timer. If no keys are pressed within 2.5s, emits `typing.stop`.
  - When the message is sent, immediately cancels the timer and emits `typing.stop`.
- **When Remote Participant Types**:
  - The socket receives `typing.started`.
  - The header status switches to **"Typing..."**.
  - The animated `TypingIndicator` appears in the conversation stream.

### B. Presence & "Last Active 5 Minutes Ago"
- **Subscription**: On entering a room or viewing the conversation list, the app emits `presence.subscribe` with target `userIds`.
- **Broadcasts**: Server emits `presence.updated` / `user.status` with `{ userId, isOnline, lastActiveAt }`.
- **Formatting (`formatLastActive.ts`)**:
  - If typing: `"Typing..."`
  - If `isOnline`: `"Online"`
  - If offline:
    - `< 1 min`: `"Active just now"`
    - `< 60 mins`: `"Active X minutes ago"` (e.g. `"Active 5 minutes ago"`)
    - `< 24 hours`: `"Active X hours ago"`
    - Yesterday: `"Active yesterday at 14:20"`
    - Earlier: `"Last seen DD/MM/YYYY"`

---

## 6. Directory Map of Socket & Chat Files

| File | Purpose |
| :--- | :--- |
| [`src/core/socket/socketEvents.ts`](file:///c:/dev/whatsapp-clone/src/core/socket/socketEvents.ts) | TypeScript interfaces for all Client $\to$ Server and Server $\to$ Client events. |
| [`src/core/store/useSocketStore.ts`](file:///c:/dev/whatsapp-clone/src/core/store/useSocketStore.ts) | Centralized Zustand store managing Socket.IO connection, room join/leave, presence maps, and typing maps. |
| [`src/core/lib/queryClient.ts`](file:///c:/dev/whatsapp-clone/src/core/lib/queryClient.ts) | Shared TanStack `QueryClient` instance enabling cache updates from outside React. |
| [`src/features/chat/api/useMessages.ts`](file:///c:/dev/whatsapp-clone/src/features/chat/api/useMessages.ts) | React Query hook for fetching message history (`GET /v1/conversations/{id}/messages`). |
| [`src/features/chat/api/useSendMessage.ts`](file:///c:/dev/whatsapp-clone/src/features/chat/api/useSendMessage.ts) | Mutation hook for sending messages with full Optimistic Updates. |
| [`src/features/chat/api/useMarkAsRead.ts`](file:///c:/dev/whatsapp-clone/src/features/chat/api/useMarkAsRead.ts) | Mutation hook to mark messages as read upon opening a chat room. |
| [`src/features/chat/hooks/useChatRoomSocket.ts`](file:///c:/dev/whatsapp-clone/src/features/chat/hooks/useChatRoomSocket.ts) | Scoped hook for `ChatRoomScreen` that manages room joins, debounced typing, and presence. |
| [`src/features/chat/components/AnimatedMessageBubble.tsx`](file:///c:/dev/whatsapp-clone/src/features/chat/components/AnimatedMessageBubble.tsx) | Reanimated bubble with sender Bounce Up, receiver Bounce In, timestamps, and delivery ticks. |
| [`src/features/chat/components/TypingIndicator.tsx`](file:///c:/dev/whatsapp-clone/src/features/chat/components/TypingIndicator.tsx) | 3-dot animated pulsing bubble for incoming typing states. |
| [`src/features/chat/utils/formatLastActive.ts`](file:///c:/dev/whatsapp-clone/src/features/chat/utils/formatLastActive.ts) | Formats presence into humanized relative active timestamps. |
| [`src/features/chat/screens/ChatRoomScreen.tsx`](file:///c:/dev/whatsapp-clone/src/features/chat/screens/ChatRoomScreen.tsx) | Active chat room screen with live messages, typing header, and animated bubbles. |
| [`src/features/chat/screens/ChatScreen.tsx`](file:///c:/dev/whatsapp-clone/src/features/chat/screens/ChatScreen.tsx) | Conversations list screen with real-time green online presence dots. |

---

## 7. Testing with Postman or Multiple Clients

To test the socket flow against your backend:
1. Open Postman and create a **Socket.IO** request (not raw WebSocket).
2. Set URL to `https://chateo-lhuw.onrender.com/chat`.
3. In the **Auth** tab or **Handshake** settings, add `token: <JWT_ACCESS_TOKEN>`.
4. Listen for `message.created` and `typing.started`.
5. Send a message via Postman REST `POST /v1/conversations/{id}/messages` and observe the Expo app instantly render the incoming bubble with subtle bounce animation.

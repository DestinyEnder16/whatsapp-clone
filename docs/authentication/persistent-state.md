# Persistent Auth State

## Table of Contents & Code References

| Concept / Topic | Description | Code Implementation |
| :--- | :--- | :--- |
| **Auth State Definition** | Type definitions for tokens, user profile, and hydration status | [`AuthState` in `src/core/store/useAuthStore.ts`](../../src/core/store/useAuthStore.ts#L13-L39) |
| **Persist Middleware & AsyncStorage** | Connecting Zustand store with React Native's AsyncStorage engine | [`useAuthStore.ts`](../../src/core/store/useAuthStore.ts#L41-L81) |
| **Selective State Persistence (`partialize`)** | Saving only tokens & user data while excluding runtime flags | [`partialize` in `src/core/store/useAuthStore.ts`](../../src/core/store/useAuthStore.ts#L83-L88) |
| **Hydration Lifecycle (`onRehydrateStorage`)** | Detecting when disk reads complete to set `hasHydrated = true` | [`onRehydrateStorage` in `src/core/store/useAuthStore.ts`](../../src/core/store/useAuthStore.ts#L90-L96) |
| **Navigation Guard & Anti-Flicker** | Waiting for hydration before redirecting to prevent splash/onboarding flicker | [`Index` in `src/app/index.tsx`](../../src/app/index.tsx#L5-L27) |
| **Auth State Initialization upon Login** | Storing session tokens and user data upon OTP verification | [`handleOtpVerify` in `src/features/auth/screens/OtpScreen.tsx`](../../src/features/auth/screens/OtpScreen.tsx#L32-L41) |

## Purpose

When making an app where the user needs to create and account before use, you need a way to store the user's authentication state. You cannot rely on the user to log in every time they open the app. This is where persistent state comes in. Parts of the user information need to be stored so as to ensure the app can, on its own, restore user info after the app is closed and reopened.

## Implementation

In this project we use Zustand to manage the application state. Zustand provides a middleware called `persist` that can be used to persist the state of a store to storage. This middleware is used in conjunction with AsyncStorage to store the state in the device's local storage. This is done by importing the `createJSONStorage` and `persist` functions from `zustand/middleware` and the `AsyncStorage` object from `@react-native-async-storage/async-storage`.

The `createJSONStorage` function is used to create a storage adapter for `AsyncStorage`. The `persist` function is used to wrap the store in a way that it will persist the state to storage.

Example:

```javascript
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // ...state and actions
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
```

## Result

Then on reload, we fetch this data from the user's disk and populate the store with it. This means that the auth data will persist across app restarts, which is exactly what we want for auth tokens and user data.

### Problem

However when the app is restarted, AsyncStorage takes a few milliseconds to read the stored tokens into memory (this is asynchronous) and populate the store with it. During this window of time, the user's authentication state is technically `null` and the `isAuthenticated` field in zustand is `false`. Hence, the app would experience flickers. (The screen will briefly show the onboarding screen before redirecting to the chats screen).

### Solution (Hydration)

The key to solving this problem is by utilizing the `onRehydrateStorage` callback provided by the `persist` middleware. This callback is triggered once AsyncStorage finishes restoring state into memory. We check if the state has been hydrated, and if so, we set the `hasHydrated` field in zustand to `true`. This means that the `hasHydrated` flag will only be set to `true` once the state has been fully restored from storage, then the navigation guard in `src/app/index.tsx` will safely read the `hasHydrated` flag and redirect the user to the appropriate screen without any flickers.

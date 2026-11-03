# State Ownership Map

## Installation-wide state

- Theme mode and appearance preferences are stored in the theme store and apply to the installation.
- Notification preference and the local PIN configuration are installation preferences.
- MMKV provides the installation's persistence adapter, but account credentials and account data are not installation-wide.

## Account-owned state

- Auth tokens and the confirmed user profile belong to the authenticated account.
- React Query data is keyed as `account/{userId}/...` for profiles, conversations, messages, receipts, and directory searches.
- Contact matches are held in a non-persisted account-scoped Zustand store and are cleared when the account changes or logs out.
- Socket presence, typing, and conversation data are runtime account state and are disconnected or cleared during logout.

## Transition rules

1. Logout cancels and removes every `account/*` query before clearing auth state.
2. A new account gets a different query namespace, so stale observers cannot render the previous account's data.
3. Profile drafts remain local to the edit screen until the supported `UpdateProfileDto` mutation succeeds.
4. Phone-number changes are not submitted from ordinary profile editing; they require a separate verified flow.

## API schema note

The generated schema currently types `UserResponseDto.displayName` and `avatarUrl` as `Record<string, never> | null`, despite the API examples and consuming UI treating them as nullable strings. This is an upstream OpenAPI defect. The schema source should be corrected and regenerated; UI code uses narrow boundary adapters until that regeneration is available. `UpdateProfileDto` intentionally accepts only `displayName`, so avatar URLs must not be sent through that mutation.

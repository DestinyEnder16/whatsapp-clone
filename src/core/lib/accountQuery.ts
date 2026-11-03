import { QueryClient, type QueryKey } from '@tanstack/react-query';

export const accountQueryKeys = {
  root: (accountId: string) => ['account', accountId] as const,
  me: (accountId: string) => ['account', accountId, 'me'] as const,
  conversations: (accountId: string) =>
    ['account', accountId, 'conversations'] as const,
  conversation: (accountId: string, conversationId: string) =>
    ['account', accountId, 'conversation', conversationId] as const,
  messages: (accountId: string, conversationId?: string) =>
    ['account', accountId, 'messages', conversationId] as const,
  receipts: (accountId: string, conversationId?: string) =>
    ['account', accountId, 'receipts', conversationId] as const,
  userSearch: (accountId: string, query: string) =>
    ['account', accountId, 'users', 'search', query] as const,
};

export function clearAccountQueries(queryClient: QueryClient): void {
  const isAccountQuery = (query: { queryKey: QueryKey }) =>
    query.queryKey[0] === 'account';

  void queryClient.cancelQueries({ predicate: isAccountQuery });
  queryClient.removeQueries({ predicate: isAccountQuery });
}

export function getAccountId(userId: string | undefined): string | null {
  return userId || null;
}

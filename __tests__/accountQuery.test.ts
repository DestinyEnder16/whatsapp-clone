// Tests for the account-scoped React Query helpers.
// Checks that every cache key includes the account id (so two accounts never
// share cached data), that clearAccountQueries removes only account data and
// keeps unrelated queries, and that getAccountId returns null when signed out.

import { QueryClient } from '@tanstack/react-query';
import {
  accountQueryKeys,
  clearAccountQueries,
  getAccountId,
} from '@/core/lib/accountQuery';

describe('accountQueryKeys', () => {
  test('every key is namespaced by the account id', () => {
    const keys = [
      accountQueryKeys.root('A'),
      accountQueryKeys.me('A'),
      accountQueryKeys.conversations('A'),
      accountQueryKeys.conversation('A', 'c1'),
      accountQueryKeys.messages('A', 'c1'),
      accountQueryKeys.receipts('A', 'c1'),
      accountQueryKeys.userSearch('A', 'sam'),
    ];
    for (const key of keys) {
      expect(key.slice(0, 2)).toEqual(['account', 'A']);
    }
  });

  test('two accounts never share a key for the same conversation', () => {
    expect(accountQueryKeys.messages('A', 'c1')).not.toEqual(
      accountQueryKeys.messages('B', 'c1'),
    );
  });

  test('keys include the conversation and search query', () => {
    expect(accountQueryKeys.messages('A', 'c1')).toEqual([
      'account',
      'A',
      'messages',
      'c1',
    ]);
    expect(accountQueryKeys.userSearch('A', 'sam')).toEqual([
      'account',
      'A',
      'users',
      'search',
      'sam',
    ]);
  });
});

describe('clearAccountQueries', () => {
  let client: QueryClient;
  beforeEach(() => {
    client = new QueryClient();
  });
  afterEach(() => {
    client.clear(); // drops garbage-collection timers so Jest can exit
  });

  test('removes account-scoped data but keeps unrelated queries', () => {
    client.setQueryData(accountQueryKeys.messages('A', 'c1'), ['hi']);
    client.setQueryData(accountQueryKeys.me('A'), { id: 'A' });
    client.setQueryData(['app', 'config'], { version: 1 });

    clearAccountQueries(client);

    expect(
      client.getQueryData(accountQueryKeys.messages('A', 'c1')),
    ).toBeUndefined();
    expect(client.getQueryData(accountQueryKeys.me('A'))).toBeUndefined();
    expect(client.getQueryData(['app', 'config'])).toEqual({ version: 1 });
  });

  test('does not throw on an empty cache', () => {
    expect(() => clearAccountQueries(client)).not.toThrow();
  });
});

describe('getAccountId', () => {
  test('returns the id, or null when signed out', () => {
    expect(getAccountId('user-1')).toBe('user-1');
    expect(getAccountId(undefined)).toBeNull();
    expect(getAccountId('')).toBeNull();
  });
});

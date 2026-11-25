import React from 'react';
import { act } from '@testing-library/react-native';
import {
  QueryClient,
  QueryClientProvider,
  notifyManager,
} from '@tanstack/react-query';

/**
 * React Query delivers cache updates to components from a timer, which React
 * reports as "not wrapped in act(...)". Deliver them inside act() instead.
 * Call once per test file, e.g. in beforeAll.
 */
export function deliverQueryUpdatesInsideAct() {
  notifyManager.setScheduler((callback) => {
    setTimeout(() => {
      act(() => {
        callback();
      });
    }, 0);
  });
}

/** A QueryClient with no retries and no garbage-collection timers. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
}

export function createQueryWrapper(client: QueryClient) {
  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

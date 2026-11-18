import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { QueryClient } from '@tanstack/react-query';
import { api } from '@/services/api/client';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useMessages } from '@/features/chat/api/useMessages';
import { useMessageOutboxStore } from '@/features/chat/store/useMessageOutboxStore';
import { clearPersisted } from '../test-utils/mmkvMock';
import {
  createQueryWrapper,
  createTestQueryClient,
  deliverQueryUpdatesInsideAct,
} from '../test-utils/reactQuery';

// Boundaries replaced: the HTTP client, storage and the auth store (kept as a
// small real zustand store so tests can sign in and out).
jest.mock('@/core/storage/mmkv', () => require('../test-utils/mmkvMock'));
jest.mock('@/services/api/client', () => ({
  api: { POST: jest.fn(), GET: jest.fn() },
}));
jest.mock('@/core/store/useAuthStore', () => {
  const { create } = require('zustand');
  return {
    useAuthStore: create(() => ({
      isAuthenticated: true,
      user: { id: 'A' },
    })),
  };
});

const get = api.GET as unknown as jest.Mock;
const authStore = useAuthStore as unknown as {
  setState: (state: object) => void;
};

const serverMessage = (clientMessageId: string, text = 'hello') => ({
  id: `server-${clientMessageId}`,
  conversationId: 'c1',
  clientMessageId,
  senderId: 'B',
  kind: 'text',
  text,
  attachments: [],
  createdAt: '2026-11-18T10:00:00.000Z',
});

const page = (items: any[], nextCursor: string | null = null) => ({
  items,
  pageInfo: { nextCursor, hasNextPage: nextCursor !== null },
});

const outbox = (overrides = {}) => ({
  accountId: 'A',
  conversationId: 'c1',
  clientMessageId: 'unsent-1',
  text: 'draft I never delivered',
  createdAt: '2026-11-18T11:00:00.000Z',
  status: 'pending' as const,
  ...overrides,
});

const seedOutbox = (...messages: ReturnType<typeof outbox>[]) =>
  useMessageOutboxStore.setState({
    messages: Object.fromEntries(
      messages.map((m) => [
        `${m.accountId}:${m.conversationId}:${m.clientMessageId}`,
        m,
      ]),
    ),
  });

let queryClient: QueryClient;

function setup(conversationId: string | null = 'c1') {
  return renderHook(() => useMessages(conversationId ?? undefined), {
    wrapper: createQueryWrapper(queryClient),
  });
}

const allItems = (data: any) =>
  (data?.pages ?? []).flatMap((p: any) => p.items) as any[];

beforeAll(deliverQueryUpdatesInsideAct);

beforeEach(() => {
  clearPersisted();
  useMessageOutboxStore.setState({ messages: {} });
  authStore.setState({ isAuthenticated: true, user: { id: 'A' } });
  queryClient = createTestQueryClient();
  get.mockResolvedValue({ data: page([serverMessage('s1')]), error: undefined });
});

afterEach(() => {
  queryClient.clear();
});

describe('loading history', () => {
  test('requests the conversation with a page size of 50', async () => {
    const { result } = await setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(get).toHaveBeenCalledWith(
      '/v1/conversations/{conversationId}/messages',
      {
        params: {
          path: { conversationId: 'c1' },
          query: { limit: 50, cursor: undefined },
        },
      },
    );
    expect(allItems(result.current.data)).toEqual([serverMessage('s1')]);
  });

  test('fetches the next page with the cursor from the last page', async () => {
    get
      .mockResolvedValueOnce({
        data: page([serverMessage('s1')], 'cursor-2'),
        error: undefined,
      })
      .mockResolvedValueOnce({
        data: page([serverMessage('s2')]),
        error: undefined,
      });
    const { result } = await setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(get.mock.calls[1][1].params.query.cursor).toBe('cursor-2');
    await waitFor(() =>
      expect(
        allItems(result.current.data).map((m) => m.clientMessageId),
      ).toEqual(['s1', 's2']),
    );
    expect(result.current.hasNextPage).toBe(false);
  });

  test('reports an error when the server rejects the request', async () => {
    get.mockResolvedValue({ data: undefined, error: { message: 'Forbidden' } });
    const { result } = await setup();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Forbidden');
  });

  test('does not fetch without a conversation id', async () => {
    await setup(null);
    await act(async () => {});
    expect(get).not.toHaveBeenCalled();
  });

  test('does not fetch while signed out', async () => {
    authStore.setState({ isAuthenticated: false, user: null });
    await setup();
    await act(async () => {});
    expect(get).not.toHaveBeenCalled();
  });
});

describe('recovering unsent messages after a restart', () => {
  test('shows a message that was pending when the app closed as failed, ready to retry', async () => {
    seedOutbox(outbox({ status: 'pending' }));
    const { result } = await setup();

    await waitFor(() =>
      expect(allItems(result.current.data).map((m) => m.clientMessageId)).toEqual(
        ['s1', 'unsent-1'],
      ),
    );
    expect(allItems(result.current.data)[1]).toMatchObject({
      id: 'optimistic-unsent-1',
      senderId: 'A',
      text: 'draft I never delivered',
      kind: 'text',
      sendStatus: 'failed',
      createdAt: '2026-11-18T11:00:00.000Z',
    });
  });

  test('keeps a message that had already failed as failed', async () => {
    seedOutbox(outbox({ status: 'failed' }));
    const { result } = await setup();

    await waitFor(() => expect(allItems(result.current.data)).toHaveLength(2));
    expect(allItems(result.current.data)[1].sendStatus).toBe('failed');
  });

  test('restores an unsent attachment message as an image with its media ids', async () => {
    seedOutbox(
      outbox({ text: undefined, attachmentMediaIds: ['media-1', 'media-2'] }),
    );
    const { result } = await setup();

    await waitFor(() => expect(allItems(result.current.data)).toHaveLength(2));
    expect(allItems(result.current.data)[1]).toMatchObject({
      kind: 'image',
      text: '',
      attachmentMediaIds: ['media-1', 'media-2'],
    });
  });

  test('does not duplicate a message the server already has', async () => {
    seedOutbox(outbox({ clientMessageId: 's1' }));
    const { result } = await setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => {});

    expect(allItems(result.current.data)).toEqual([serverMessage('s1')]);
  });

  test("does not show another account's or another conversation's unsent messages", async () => {
    seedOutbox(
      outbox({ clientMessageId: 'other-account', accountId: 'B' }),
      outbox({ clientMessageId: 'other-chat', conversationId: 'c2' }),
    );
    const { result } = await setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => {});

    expect(allItems(result.current.data)).toEqual([serverMessage('s1')]);
  });

  test('adds nothing when the outbox is empty', async () => {
    const { result } = await setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => {});

    expect(allItems(result.current.data)).toEqual([serverMessage('s1')]);
  });
});

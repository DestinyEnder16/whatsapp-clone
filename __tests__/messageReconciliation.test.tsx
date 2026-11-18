// Tests that unsent messages survive a restart and that the server's
// confirmation is authoritative, whichever way it arrives.
// F5: after a restart with an empty cache and NO network, failed/unsent
//     messages (and their Retry data) are still shown from the durable outbox;
//     when history later loads it is merged without duplicates, and accounts
//     never see each other's entries.
// F6: if the socket delivers the server's copy before the HTTP request fails,
//     the confirmed message must not be downgraded to "failed", and the outbox
//     entry must be removed. Also covers a lost HTTP response (restart) and the
//     same message appearing in two history pages.
// The HTTP client, socket connection and storage are mocked; the real socket
// message handler, auth store, outbox and React Query are used.
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { accountQueryKeys } from '@/core/lib/accountQuery';
import { queryClient } from '@/core/lib/queryClient';
import { useSocketStore } from '@/core/store/useSocketStore';
import { useMessages } from '@/features/chat/api/useMessages';
import { useSendMessage } from '@/features/chat/api/useSendMessage';
import { useMessageOutboxStore } from '@/features/chat/store/useMessageOutboxStore';
import { api } from '@/services/api/client';
import { useUploadOperationStore } from '@/services/media/uploadOperationStore';
import { deferred } from '../test-utils/deferred';
import { clearPersisted } from '../test-utils/mmkvMock';
import { signIn, signOut, switchAccount } from '../test-utils/authSession';
import {
  createQueryWrapper,
  deliverQueryUpdatesInsideAct,
} from '../test-utils/reactQuery';

jest.mock('@/core/storage/mmkv', () => require('../test-utils/mmkvMock'));
jest.mock('@/services/notifications', () =>
  require('../test-utils/authSession').notificationsMock(),
);
jest.mock('@/services/api/authSession', () =>
  require('../test-utils/authSession').authSessionMock(),
);
jest.mock('@/services/api/client', () => ({
  api: { POST: jest.fn(), GET: jest.fn() },
}));
jest.mock('expo-file-system', () => require('../test-utils/fileSystemMock'));

// A fake socket that records the handlers the real store registers.
const mockHandlers: Record<string, (payload: any) => void> = {};
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    connected: true,
    on: (event: string, handler: (payload: any) => void) => {
      mockHandlers[event] = handler;
    },
    emit: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
}));

const post = api.POST as unknown as jest.Mock;
const get = api.GET as unknown as jest.Mock;

const serverMessage = (clientMessageId: string, extra = {}) => ({
  id: `server-${clientMessageId}`,
  conversationId: 'c1',
  clientMessageId,
  senderId: 'A',
  kind: 'text',
  text: 'hello',
  attachments: [],
  createdAt: '2026-11-18T10:00:00.000Z',
  ...extra,
});
const page = (items: any[], nextCursor: string | null = null) => ({
  items,
  pageInfo: { nextCursor, hasNextPage: nextCursor !== null },
});
const entry = (overrides = {}) => ({
  accountId: 'A',
  conversationId: 'c1',
  clientMessageId: 'm1',
  text: 'unsent text',
  createdAt: '2026-11-18T11:00:00.000Z',
  status: 'pending' as const,
  ...overrides,
});
const seedOutbox = (...entries: ReturnType<typeof entry>[]) =>
  useMessageOutboxStore.setState({
    messages: Object.fromEntries(
      entries.map((e) => [`${e.accountId}:${e.conversationId}:${e.clientMessageId}`, e]),
    ),
  });
const outboxKeys = () => Object.keys(useMessageOutboxStore.getState().messages);
const itemsOf = (data: any) =>
  (data?.pages ?? []).flatMap((p: any) => p.items) as any[];
const cachedItems = () =>
  itemsOf(queryClient.getQueryData(accountQueryKeys.messages('A', 'c1')));

const wrapper = createQueryWrapper(queryClient);
const setupMessages = () => renderHook(() => useMessages('c1'), { wrapper });
const setupSend = () => renderHook(() => useSendMessage(), { wrapper });

/** What the server pushes over the socket when a message is stored. */
const socketDeliver = (message: object) =>
  act(() => {
    mockHandlers['message.created']({ message });
  });

beforeAll(() => {
  deliverQueryUpdatesInsideAct();
  queryClient.setDefaultOptions({
    queries: { retry: false, gcTime: Infinity },
    mutations: { retry: false, gcTime: Infinity },
  });
});

beforeEach(() => {
  clearPersisted();
  useMessageOutboxStore.setState({ messages: {} });
  useUploadOperationStore.setState({ operations: {} });
  queryClient.clear();
  post.mockReset();
  get.mockReset();
  signOut();
  signIn('A');
  // Connect the real socket store so its message.created handler is registered.
  act(() => {
    useSocketStore.getState().connect();
  });
});

afterAll(() => {
  queryClient.clear();
});

describe('F5: unsent messages when history cannot load', () => {
  test('a message that was pending at restart is shown as failed, with no history and no network', async () => {
    seedOutbox(entry({ status: 'pending' }));
    get.mockRejectedValue(new Error('Network request failed'));

    const { result } = await setupMessages();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(itemsOf(result.current.data)).toEqual([
      expect.objectContaining({
        clientMessageId: 'm1',
        text: 'unsent text',
        senderId: 'A',
        sendStatus: 'failed', // retryable: the app was closed mid-send
      }),
    ]);
  });

  test('a message that had already failed is shown as failed', async () => {
    seedOutbox(entry({ status: 'failed' }));
    get.mockRejectedValue(new Error('Network request failed'));

    const { result } = await setupMessages();
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(itemsOf(result.current.data)[0].sendStatus).toBe('failed');
  });

  test('is shown immediately, before history has finished loading', async () => {
    seedOutbox(entry());
    get.mockReturnValue(new Promise(() => {})); // history never answers

    const { result } = await setupMessages();

    expect(result.current.isLoading).toBe(true);
    expect(itemsOf(result.current.data).map((m) => m.clientMessageId)).toEqual(['m1']);
  });

  test('keeps the data a failed photo needs to be retried', async () => {
    seedOutbox(
      entry({
        text: undefined,
        upload: {
          clientUploadId: 'upload-1',
          media: { uri: 'file:///documents/pending-uploads/photo.jpg' },
        },
        status: 'failed',
      }),
    );
    get.mockRejectedValue(new Error('Network request failed'));

    const { result } = await setupMessages();
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(itemsOf(result.current.data)[0]).toMatchObject({
      kind: 'image',
      sendStatus: 'failed',
      clientUploadId: 'upload-1',
      localMedia: { uri: 'file:///documents/pending-uploads/photo.jpg' },
    });
  });

  test('when the network returns, history is merged in and the message is not duplicated', async () => {
    seedOutbox(entry({ status: 'failed' }));
    get.mockRejectedValueOnce(new Error('Network request failed'));
    const { result } = await setupMessages();
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Reconnect: history loads and contains an older message plus the one the
    // server did receive.
    get.mockResolvedValue({
      data: page([serverMessage('older', { text: 'earlier' }), serverMessage('m1')]),
      error: undefined,
    });
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() =>
      expect(itemsOf(result.current.data).map((m) => m.clientMessageId)).toEqual([
        'older',
        'm1',
      ]),
    );
    expect(itemsOf(result.current.data)[1].id).toBe('server-m1'); // confirmed copy
    expect(outboxKeys()).toEqual([]); // and its outbox entry is finished
  });

  test('when history arrives without the message it stays visible for retry', async () => {
    seedOutbox(entry({ status: 'failed' }));
    get.mockResolvedValue({ data: page([serverMessage('older')]), error: undefined });

    const { result } = await setupMessages();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(itemsOf(result.current.data).map((m) => m.clientMessageId)).toEqual([
      'older',
      'm1',
    ]);
    expect(outboxKeys()).toHaveLength(1);
  });

  test("another account's unsent messages are never shown", async () => {
    seedOutbox(entry({ accountId: 'A' }), entry({ accountId: 'B', clientMessageId: 'b-1' }));
    get.mockRejectedValue(new Error('Network request failed'));

    const { result } = await setupMessages();
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(itemsOf(result.current.data).map((m) => m.clientMessageId)).toEqual(['m1']);
  });

  test('switching accounts swaps the visible unsent messages', async () => {
    seedOutbox(entry({ accountId: 'A' }), entry({ accountId: 'B', clientMessageId: 'b-1' }));
    get.mockRejectedValue(new Error('Network request failed'));

    const first = await setupMessages();
    await waitFor(() => expect(itemsOf(first.result.current.data)).toHaveLength(1));
    expect(itemsOf(first.result.current.data)[0].clientMessageId).toBe('m1');
    // The room closes before the account changes (leaving a mounted query
    // behind would re-arm its 10-minute cache timer after logout removes it).
    first.unmount();

    switchAccount('B');
    const second = await setupMessages();

    await waitFor(() =>
      expect(
        itemsOf(second.result.current.data).map((m) => m.clientMessageId),
      ).toEqual(['b-1']),
    );
  });

  test('shows nothing extra when there is nothing unsent', async () => {
    get.mockRejectedValue(new Error('Network request failed'));
    const { result } = await setupMessages();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

describe('F6: the server confirmation is authoritative', () => {
  const send = (result: any) =>
    act(() => {
      result.current.mutate({
        conversationId: 'c1',
        text: 'hello',
        clientMessageId: 'm1',
      });
    });

  test('socket before HTTP success: one confirmed message, outbox cleared', async () => {
    const request = deferred<any>();
    post.mockReturnValueOnce(request.promise);
    const { result } = await setupSend();
    send(result);
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(outboxKeys()).toHaveLength(1);

    socketDeliver(serverMessage('m1')); // the server's copy arrives first
    expect(cachedItems()).toEqual([serverMessage('m1')]);
    expect(outboxKeys()).toEqual([]); // finished as soon as it was confirmed

    await act(async () => {
      request.resolve({ data: serverMessage('m1'), error: undefined });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(cachedItems()).toEqual([serverMessage('m1')]); // exactly one
    expect(outboxKeys()).toEqual([]);
  });

  test('socket before HTTP FAILURE: the confirmed message is not downgraded to failed', async () => {
    const request = deferred<any>();
    post.mockReturnValueOnce(request.promise);
    const { result } = await setupSend();
    send(result);
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));

    socketDeliver(serverMessage('m1'));
    await act(async () => {
      request.resolve({ data: undefined, error: { message: 'Gateway timeout' } });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Delivered and acknowledged: no failed state, no Retry, no stale outbox.
    expect(cachedItems()).toHaveLength(1);
    expect(cachedItems()[0]).toMatchObject({ id: 'server-m1' });
    expect(cachedItems()[0].sendStatus).toBeUndefined();
    expect(outboxKeys()).toEqual([]);
  });

  test('without a socket confirmation a failure is still shown as failed and kept', async () => {
    post.mockResolvedValue({ data: undefined, error: { message: 'Offline' } });
    const { result } = await setupSend();
    send(result);
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(cachedItems()[0]).toMatchObject({ clientMessageId: 'm1', sendStatus: 'failed' });
    expect(outboxKeys()).toHaveLength(1);
  });

  test("another person's message arriving by socket never touches the outbox", async () => {
    seedOutbox(entry());
    socketDeliver(serverMessage('theirs', { senderId: 'B' }));
    expect(outboxKeys()).toHaveLength(1);
  });

  test('restart after a lost HTTP response: history has the message, shown once, outbox cleared', async () => {
    seedOutbox(entry({ status: 'pending' })); // the app died before the response
    get.mockResolvedValue({
      data: page([serverMessage('m1', { text: 'unsent text' })]),
      error: undefined,
    });

    const { result } = await setupMessages();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await waitFor(() => expect(outboxKeys()).toEqual([]));
    expect(itemsOf(result.current.data)).toHaveLength(1);
    expect(itemsOf(result.current.data)[0]).toMatchObject({ id: 'server-m1' });
    expect(itemsOf(result.current.data)[0].sendStatus).toBeUndefined();
  });

  test('a message that appears in two history pages is shown once', async () => {
    get
      .mockResolvedValueOnce({
        data: page([serverMessage('m2'), serverMessage('m1')], 'cursor-2'),
        error: undefined,
      })
      .mockResolvedValueOnce({
        data: page([serverMessage('m1'), serverMessage('m0')]), // m1 overlaps
        error: undefined,
      });
    const { result } = await setupMessages();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() =>
      expect(itemsOf(result.current.data).map((m) => m.clientMessageId)).toEqual([
        'm2',
        'm1',
        'm0',
      ]),
    );
  });

  test('a placeholder is dropped when the confirmed copy is also present', async () => {
    seedOutbox(entry({ status: 'pending' }));
    get.mockResolvedValue({
      data: page([
        serverMessage('m1'),
        { ...serverMessage('m1'), id: 'optimistic-m1', sendStatus: 'pending' },
      ]),
      error: undefined,
    });

    const { result } = await setupMessages();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(itemsOf(result.current.data).map((m) => m.id)).toEqual(['server-m1']);
  });

  test('the finished upload record is discarded with the outbox entry when the socket confirms a photo', async () => {
    seedOutbox(
      entry({
        text: undefined,
        upload: { clientUploadId: 'upload-1', media: { uri: 'file:///x.jpg' } },
      }),
    );
    useUploadOperationStore.getState().save({
      accountId: 'A',
      clientUploadId: 'upload-1',
      purpose: 'message_attachment',
      media: { uri: 'file:///x.jpg' },
      stage: 'completed',
      createdAt: '2026-11-18T11:00:00.000Z',
    });

    socketDeliver(serverMessage('m1'));

    expect(outboxKeys()).toEqual([]);
    expect(useUploadOperationStore.getState().operations).toEqual({});
  });
});

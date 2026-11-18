import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { QueryClient } from '@tanstack/react-query';
import { accountQueryKeys } from '@/core/lib/accountQuery';
import { api } from '@/services/api/client';
import {
  generateClientMessageId,
  useSendMessage,
} from '@/features/chat/api/useSendMessage';
import { useMessageOutboxStore } from '@/features/chat/store/useMessageOutboxStore';
import { deferred } from '../test-utils/deferred';
import { clearPersisted } from '../test-utils/mmkvMock';
import {
  createQueryWrapper,
  createTestQueryClient,
  deliverQueryUpdatesInsideAct,
} from '../test-utils/reactQuery';

// Boundaries replaced: the HTTP client, storage and the auth store.
jest.mock('@/core/storage/mmkv', () => require('../test-utils/mmkvMock'));
jest.mock('@/services/api/client', () => ({
  api: { POST: jest.fn(), GET: jest.fn() },
}));
jest.mock('@/core/store/useAuthStore', () => {
  const { create } = require('zustand');
  return { useAuthStore: create(() => ({ user: { id: 'A' } })) };
});

const post = api.POST as unknown as jest.Mock;
const messagesKey = accountQueryKeys.messages('A', 'c1');

const serverMessage = (clientMessageId: string, text = 'hello') => ({
  id: `server-${clientMessageId}`,
  conversationId: 'c1',
  clientMessageId,
  senderId: 'A',
  kind: 'text',
  text,
  attachments: [],
  createdAt: '2026-11-18T10:00:00.000Z',
});

let queryClient: QueryClient;

function setup() {
  return renderHook(() => useSendMessage(), {
    wrapper: createQueryWrapper(queryClient),
  });
}

const cachedItems = () =>
  (queryClient.getQueryData(messagesKey) as any)?.pages[0].items as any[];

beforeAll(deliverQueryUpdatesInsideAct);

beforeEach(() => {
  clearPersisted();
  useMessageOutboxStore.setState({ messages: {} });
  queryClient = createTestQueryClient();
});

afterEach(() => {
  queryClient.clear();
});

describe('generateClientMessageId', () => {
  test('returns a v4-style UUID', () => {
    expect(generateClientMessageId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  test('returns a different id each time', () => {
    const ids = new Set(Array.from({ length: 50 }, generateClientMessageId));
    expect(ids.size).toBe(50);
  });
});

describe('sending successfully', () => {
  test('posts the text with its client message id to the right conversation', async () => {
    post.mockResolvedValue({ data: serverMessage('m1'), error: undefined });
    const { result } = await setup();

    await act(async () => {
      await result.current.mutateAsync({
        conversationId: 'c1',
        text: 'hello',
        clientMessageId: 'm1',
      });
    });

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      '/v1/conversations/{conversationId}/messages',
      {
        params: { path: { conversationId: 'c1' } },
        body: {
          clientMessageId: 'm1',
          text: 'hello',
          attachmentMediaIds: undefined,
        },
      },
    );
  });

  test('shows the message at once as pending and keeps it in the outbox', async () => {
    const request = deferred<any>();
    post.mockReturnValue(request.promise);
    const { result } = await setup();

    act(() => {
      result.current.mutate({
        conversationId: 'c1',
        text: 'hello',
        clientMessageId: 'm1',
      });
    });

    await waitFor(() => expect(cachedItems()).toHaveLength(1));
    expect(cachedItems()[0]).toMatchObject({
      id: 'optimistic-m1',
      clientMessageId: 'm1',
      senderId: 'A',
      text: 'hello',
      kind: 'text',
      sendStatus: 'pending',
    });
    expect(useMessageOutboxStore.getState().messages['A:c1:m1']).toMatchObject({
      status: 'pending',
      text: 'hello',
    });

    await act(async () => {
      request.resolve({ data: serverMessage('m1'), error: undefined });
    });
  });

  test('replaces the pending message with the server copy and empties the outbox', async () => {
    post.mockResolvedValue({ data: serverMessage('m1'), error: undefined });
    const { result } = await setup();

    await act(async () => {
      await result.current.mutateAsync({
        conversationId: 'c1',
        text: 'hello',
        clientMessageId: 'm1',
      });
    });

    expect(cachedItems()).toEqual([serverMessage('m1')]);
    expect(useMessageOutboxStore.getState().messages).toEqual({});
  });

  test('appends to existing history instead of replacing it', async () => {
    queryClient.setQueryData(messagesKey, {
      pages: [
        {
          items: [serverMessage('old', 'earlier')],
          pageInfo: { nextCursor: null, hasNextPage: false },
        },
      ],
      pageParams: [null],
    });
    post.mockResolvedValue({ data: serverMessage('m1'), error: undefined });
    const { result } = await setup();

    await act(async () => {
      await result.current.mutateAsync({
        conversationId: 'c1',
        text: 'hello',
        clientMessageId: 'm1',
      });
    });

    expect(cachedItems().map((m) => m.clientMessageId)).toEqual(['old', 'm1']);
  });

  test('refreshes the conversation list so the preview updates', async () => {
    post.mockResolvedValue({ data: serverMessage('m1'), error: undefined });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = await setup();

    await act(async () => {
      await result.current.mutateAsync({
        conversationId: 'c1',
        text: 'hello',
        clientMessageId: 'm1',
      });
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: accountQueryKeys.conversations('A'),
    });
  });

  test('generates a client message id when none is supplied', async () => {
    post.mockResolvedValue({ data: serverMessage('x'), error: undefined });
    const { result } = await setup();

    await act(async () => {
      await result.current.mutateAsync({ conversationId: 'c1', text: 'hi' });
    });

    expect(post.mock.calls[0][1].body.clientMessageId).toMatch(
      /^[0-9a-f-]{36}$/,
    );
  });

  test('a message with attachments is shown as an image', async () => {
    const request = deferred<any>();
    post.mockReturnValue(request.promise);
    const { result } = await setup();

    act(() => {
      result.current.mutate({
        conversationId: 'c1',
        attachmentMediaIds: ['media-1'],
        clientMessageId: 'm1',
      });
    });

    await waitFor(() => expect(cachedItems()).toHaveLength(1));
    expect(cachedItems()[0]).toMatchObject({
      kind: 'image',
      attachmentMediaIds: ['media-1'],
      text: '',
    });

    await act(async () => {
      request.resolve({ data: serverMessage('m1'), error: undefined });
    });
  });
});

describe('sending fails', () => {
  test('rejects with the server message', async () => {
    post.mockResolvedValue({ data: undefined, error: { message: 'Offline' } });
    const { result } = await setup();

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          conversationId: 'c1',
          text: 'hello',
          clientMessageId: 'm1',
        }),
      ).rejects.toThrow('Offline');
    });
  });

  test('falls back to a default message when the server gives none', async () => {
    post.mockResolvedValue({ data: undefined, error: {} });
    const { result } = await setup();

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          conversationId: 'c1',
          text: 'hello',
          clientMessageId: 'm1',
        }),
      ).rejects.toThrow('Failed to send message');
    });
  });

  test('keeps the message, marked failed, in both the list and the outbox', async () => {
    post.mockResolvedValue({ data: undefined, error: { message: 'Offline' } });
    const { result } = await setup();

    await act(async () => {
      await result.current
        .mutateAsync({
          conversationId: 'c1',
          text: 'keep me',
          clientMessageId: 'm1',
        })
        .catch(() => undefined);
    });

    expect(cachedItems()).toHaveLength(1);
    expect(cachedItems()[0]).toMatchObject({
      clientMessageId: 'm1',
      text: 'keep me',
      sendStatus: 'failed',
    });
    expect(useMessageOutboxStore.getState().messages['A:c1:m1']).toMatchObject({
      status: 'failed',
      text: 'keep me',
    });
  });

  test('a retry reuses the client id: one bubble, one server message', async () => {
    post
      .mockResolvedValueOnce({ data: undefined, error: { message: 'Offline' } })
      .mockResolvedValueOnce({ data: serverMessage('m1'), error: undefined });
    const { result } = await setup();
    const variables = {
      conversationId: 'c1',
      text: 'hello',
      clientMessageId: 'm1',
    };

    await act(async () => {
      await result.current.mutateAsync(variables).catch(() => undefined);
    });
    await act(async () => {
      await result.current.mutateAsync(variables);
    });

    expect(post.mock.calls.map((call) => call[1].body.clientMessageId)).toEqual([
      'm1',
      'm1',
    ]);
    expect(cachedItems()).toEqual([serverMessage('m1')]);
    expect(useMessageOutboxStore.getState().messages).toEqual({});
  });

  test('a failed send leaves earlier messages untouched', async () => {
    queryClient.setQueryData(messagesKey, {
      pages: [
        {
          items: [serverMessage('old', 'earlier')],
          pageInfo: { nextCursor: null, hasNextPage: false },
        },
      ],
      pageParams: [null],
    });
    post.mockResolvedValue({ data: undefined, error: { message: 'Offline' } });
    const { result } = await setup();

    await act(async () => {
      await result.current
        .mutateAsync({
          conversationId: 'c1',
          text: 'new',
          clientMessageId: 'm1',
        })
        .catch(() => undefined);
    });

    expect(cachedItems()[0]).toEqual(serverMessage('old', 'earlier'));
    expect(cachedItems()[1]).toMatchObject({ sendStatus: 'failed' });
  });
});

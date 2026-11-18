// Tests for useSendMessage across logout/login and for photo messages.
// Session safety: a send prepared by account A must never be saved into B's
// outbox or cache, even if the session changes while preparing (before the
// request starts), while the request is in flight, or when the same account logs
// out and back in. Reproduces the review's finding that the account was read
// AFTER an await.
// Photos: the upload runs inside the same owned operation as the message, is
// saved durably from the moment the photo is chosen, and a retry resumes the
// failed stage (it does not transfer the file again).
// The HTTP client, file system and storage are mocked; the real auth store,
// session counter, outbox, upload records and React Query are used.
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { QueryClient } from '@tanstack/react-query';
import { accountQueryKeys } from '@/core/lib/accountQuery';
import { api } from '@/services/api/client';
import { useSendMessage } from '@/features/chat/api/useSendMessage';
import { useMessageOutboxStore } from '@/features/chat/store/useMessageOutboxStore';
import { useUploadOperationStore } from '@/services/media/uploadOperationStore';
import { deferred } from '../test-utils/deferred';
import { clearPersisted } from '../test-utils/mmkvMock';
import { signIn, signOut, switchAccount } from '../test-utils/authSession';
import {
  createQueryWrapper,
  createTestQueryClient,
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

const post = api.POST as unknown as jest.Mock;
const fetchMock = jest.fn();

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

const isMessagePost = (path: string) =>
  path === '/v1/conversations/{conversationId}/messages';
const messagePosts = () => post.mock.calls.filter(([p]) => isMessagePost(p));
const authorizeCalls = () =>
  post.mock.calls.filter(([p]) => p === '/v1/media/uploads');
const completeCalls = () =>
  post.mock.calls.filter(([p]) => String(p).endsWith('/complete'));
const transferCalls = () =>
  fetchMock.mock.calls.filter(([url]) => url === 'https://upload.test');

const outboxFor = (accountId: string) =>
  Object.values(useMessageOutboxStore.getState().messages).filter(
    (m) => m.accountId === accountId,
  );
const cachedItems = (accountId: string) =>
  (queryClient.getQueryData(accountQueryKeys.messages(accountId, 'c1')) as any)
    ?.pages[0].items as any[] | undefined;

let queryClient: QueryClient;

const setup = () =>
  renderHook(() => useSendMessage(), {
    wrapper: createQueryWrapper(queryClient),
  });

beforeAll(deliverQueryUpdatesInsideAct);

beforeEach(() => {
  clearPersisted();
  useMessageOutboxStore.setState({ messages: {} });
  useUploadOperationStore.setState({ operations: {} });
  signOut();
  signIn('A');
  queryClient = createTestQueryClient();
  post.mockReset();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  post.mockImplementation(async (path: string, init: any) =>
    isMessagePost(path)
      ? {
          data: serverMessage(init.body.clientMessageId, {
            attachments: init.body.attachmentMediaIds?.length
              ? [{ mediaId: init.body.attachmentMediaIds[0], type: 'image', url: 'https://cdn/p.jpg' }]
              : [],
          }),
          error: undefined,
        }
      : path === '/v1/media/uploads'
        ? {
            data: {
              media: { id: 'media-1' },
              upload: { url: 'https://upload.test', fields: { s: '1' } },
            },
            error: undefined,
          }
        : { data: { id: 'media-1', status: 'ready' }, error: undefined },
  );
  fetchMock.mockImplementation(async (url: string) =>
    url === 'https://upload.test'
      ? { ok: true, status: 200 }
      : { ok: true, blob: async () => new Blob(['x']) },
  );
});

afterEach(() => {
  queryClient.clear();
});

describe('a send prepared by A while the session changes', () => {
  // The review held cancelQueries open, switched accounts, then watched A's
  // captured send get saved into B's outbox because the account was read after
  // the await.
  test.each([
    ['account B signs in', 'B'],
    ['the same account signs out and back in', 'A'],
  ])('is dropped when %s while preparing', async (_label, nextAccount) => {
    const preparing = deferred<void>();
    jest
      .spyOn(queryClient, 'cancelQueries')
      .mockReturnValueOnce(preparing.promise);
    const { result } = await setup();
    const onSuccess = jest.fn();

    act(() => {
      result.current.mutate(
        { conversationId: 'c1', text: 'for A', clientMessageId: 'm1' },
        { onSuccess },
      );
    });

    switchAccount(nextAccount);
    await act(async () => {
      preparing.resolve();
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(messagePosts()).toHaveLength(0); // never sent
    expect(onSuccess).not.toHaveBeenCalled();
    // Nothing from A's send landed in anyone's outbox or cache.
    expect(Object.keys(useMessageOutboxStore.getState().messages)).toEqual([]);
    expect(cachedItems('A')).toBeUndefined();
    expect(cachedItems('B')).toBeUndefined();
  });

  test("a stopped send does not look like an error for the next user", async () => {
    const preparing = deferred<void>();
    jest
      .spyOn(queryClient, 'cancelQueries')
      .mockReturnValueOnce(preparing.promise);
    const { result } = await setup();

    act(() => {
      result.current.mutate({ conversationId: 'c1', text: 'x', clientMessageId: 'm1' });
    });
    switchAccount('B');
    await act(async () => {
      preparing.resolve();
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect((result.current.error as Error).name).toBe('SessionChangedError');
  });
});

describe('a send already in flight when the session changes', () => {
  test("A's confirmation updates only A's data, never B's", async () => {
    const request = deferred<any>();
    post.mockReturnValueOnce(request.promise);
    const { result } = await setup();

    act(() => {
      result.current.mutate({ conversationId: 'c1', text: 'for A', clientMessageId: 'm1' });
    });
    await waitFor(() => expect(messagePosts()).toHaveLength(1));
    expect(outboxFor('A')).toHaveLength(1);

    switchAccount('B');
    await act(async () => {
      request.resolve({ data: serverMessage('m1'), error: undefined });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(outboxFor('B')).toHaveLength(0);
    expect(cachedItems('B')).toBeUndefined();
    expect(outboxFor('A')).toHaveLength(0); // A's own record is finished
  });

  test("A's failure is kept for A to retry, and does not touch B", async () => {
    const request = deferred<any>();
    post.mockReturnValueOnce(request.promise);
    const { result } = await setup();

    act(() => {
      result.current.mutate({ conversationId: 'c1', text: 'for A', clientMessageId: 'm1' });
    });
    await waitFor(() => expect(messagePosts()).toHaveLength(1));

    switchAccount('B');
    await act(async () => {
      request.resolve({ data: undefined, error: { message: 'Offline' } });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(outboxFor('A')).toMatchObject([{ clientMessageId: 'm1', status: 'failed' }]);
    expect(outboxFor('B')).toHaveLength(0);
    expect(cachedItems('B')).toBeUndefined();
  });

  test('the request is cancelled at the transport when the session ends', async () => {
    post.mockReturnValueOnce(new Promise(() => {})); // never settles
    const { result } = await setup();

    act(() => {
      result.current.mutate({ conversationId: 'c1', text: 'x', clientMessageId: 'm1' });
    });
    await waitFor(() => expect(messagePosts()).toHaveLength(1));
    const { signal } = messagePosts()[0][1];

    expect(signal.aborted).toBe(false);
    signOut();
    expect(signal.aborted).toBe(true);
  });
});

describe('the message id chosen first is the one sent', () => {
  test('a generated client message id is used for both the placeholder and the request', async () => {
    const { result } = await setup();

    await act(async () => {
      await result.current.mutateAsync({ conversationId: 'c1', text: 'hi' });
    });

    const sentId = messagePosts()[0][1].body.clientMessageId;
    expect(sentId).toMatch(/^[0-9a-f-]{36}$/);
    expect(cachedItems('A')).toEqual([
      expect.objectContaining({ clientMessageId: sentId, id: `server-${sentId}` }),
    ]);
  });
});

describe('sending a photo', () => {
  const PHOTO = { uri: 'file:///cache/photo.jpg', mimeType: 'image/jpeg' };
  const photo = (overrides = {}) => ({
    conversationId: 'c1',
    media: PHOTO,
    clientUploadId: 'upload-1',
    clientMessageId: 'm1',
    ...overrides,
  });

  test('uploads first, then sends the message with the completed media id', async () => {
    const { result } = await setup();

    await act(async () => {
      await result.current.mutateAsync(photo());
    });

    expect(authorizeCalls()).toHaveLength(1);
    expect(transferCalls()).toHaveLength(1);
    expect(completeCalls()).toHaveLength(1);
    expect(messagePosts()[0][1].body).toMatchObject({
      clientMessageId: 'm1',
      attachmentMediaIds: ['media-1'],
    });
  });

  test('is saved durably the moment it is chosen, before the upload finishes', async () => {
    const upload = deferred<any>();
    post.mockImplementationOnce(() => upload.promise); // authorization hangs
    const { result } = await setup();

    act(() => {
      result.current.mutate(photo());
    });

    await waitFor(() => expect(outboxFor('A')).toHaveLength(1));
    expect(outboxFor('A')[0]).toMatchObject({
      clientMessageId: 'm1',
      status: 'pending',
      upload: { clientUploadId: 'upload-1', media: { uri: PHOTO.uri } },
    });
    expect(cachedItems('A')?.[0]).toMatchObject({
      kind: 'image',
      sendStatus: 'pending',
      localMedia: { uri: PHOTO.uri },
    });

    signOut(); // end the hanging operation
    await act(async () => {
      upload.resolve({ data: undefined, error: { message: 'x' } });
    });
  });

  test('a failed completion leaves a failed, retryable photo bubble', async () => {
    post.mockImplementation(async (path: string) =>
      path === '/v1/media/uploads'
        ? {
            data: { media: { id: 'media-1' }, upload: { url: 'https://upload.test', fields: {} } },
            error: undefined,
          }
        : { data: undefined, error: { message: 'Not ready' } },
    );
    const { result } = await setup();

    await act(async () => {
      await result.current.mutateAsync(photo()).catch(() => undefined);
    });

    expect(cachedItems('A')?.[0]).toMatchObject({
      clientMessageId: 'm1',
      sendStatus: 'failed',
      localMedia: { uri: PHOTO.uri },
      clientUploadId: 'upload-1',
    });
    expect(outboxFor('A')[0]).toMatchObject({ status: 'failed' });
    expect(messagePosts()).toHaveLength(0); // never sent without the media
  });

  test('retrying resumes the upload: no second transfer, the same message id', async () => {
    let completions = 0;
    const base = post.getMockImplementation()!;
    post.mockImplementation(async (path: string, init: any) => {
      if (String(path).endsWith('/complete')) {
        completions += 1;
        if (completions === 1)
          return { data: undefined, error: { message: 'Not ready' } };
      }
      return base(path, init);
    });
    const { result } = await setup();

    await act(async () => {
      await result.current.mutateAsync(photo()).catch(() => undefined);
    });
    // Retry exactly as the room does: the failed message's own fields.
    const failed = cachedItems('A')![0];
    await act(async () => {
      await result.current.mutateAsync({
        conversationId: 'c1',
        media: failed.localMedia,
        clientUploadId: failed.clientUploadId,
        clientMessageId: failed.clientMessageId,
      });
    });

    expect(transferCalls()).toHaveLength(1); // the bytes were sent once
    expect(authorizeCalls()).toHaveLength(1);
    expect(completeCalls()).toHaveLength(2);
    expect(messagePosts()).toHaveLength(1);
    expect(messagePosts()[0][1].body.clientMessageId).toBe('m1');
    expect(cachedItems('A')).toHaveLength(1); // one bubble
    expect(cachedItems('A')![0].id).toBe('server-m1');
  });

  test('a message send that fails after a good upload is retried without uploading again', async () => {
    const base = post.getMockImplementation()!;
    let sends = 0;
    post.mockImplementation(async (path: string, init: any) => {
      if (isMessagePost(path)) {
        sends += 1;
        if (sends === 1) return { data: undefined, error: { message: 'Offline' } };
      }
      return base(path, init);
    });
    const { result } = await setup();

    await act(async () => {
      await result.current.mutateAsync(photo()).catch(() => undefined);
    });
    // The completed media id was remembered in the outbox.
    expect(outboxFor('A')[0]).toMatchObject({
      status: 'failed',
      attachmentMediaIds: ['media-1'],
    });

    const failed = cachedItems('A')![0];
    await act(async () => {
      await result.current.mutateAsync({
        conversationId: 'c1',
        media: failed.localMedia,
        clientUploadId: failed.clientUploadId,
        attachmentMediaIds: outboxFor('A')[0].attachmentMediaIds,
        clientMessageId: failed.clientMessageId,
      });
    });

    expect(authorizeCalls()).toHaveLength(1);
    expect(transferCalls()).toHaveLength(1);
    expect(completeCalls()).toHaveLength(1);
    expect(messagePosts()).toHaveLength(2);
  });

  test('the upload record is discarded once the message is confirmed', async () => {
    const { result } = await setup();

    await act(async () => {
      await result.current.mutateAsync(photo());
    });

    expect(Object.keys(useUploadOperationStore.getState().operations)).toEqual([]);
    expect(outboxFor('A')).toHaveLength(0);
  });

  test("A's photo upload does not continue into B's session", async () => {
    const authorization = deferred<any>();
    const base = post.getMockImplementation()!;
    post.mockImplementation((path: string, init: any) =>
      path === '/v1/media/uploads' ? authorization.promise : base(path, init),
    );
    const { result } = await setup();

    act(() => {
      result.current.mutate(photo());
    });
    await waitFor(() => expect(authorizeCalls()).toHaveLength(1));

    switchAccount('B'); // A's photo upload is paused at authorization
    await act(async () => {
      authorization.resolve({
        data: { media: { id: 'media-1' }, upload: { url: 'https://upload.test', fields: {} } },
        error: undefined,
      });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    // None of A's later steps ran while B was signed in.
    expect(transferCalls()).toHaveLength(0);
    expect(completeCalls()).toHaveLength(0);
    expect(messagePosts()).toHaveLength(0);
    expect(outboxFor('B')).toHaveLength(0);
    expect(cachedItems('B')).toBeUndefined();
  });

  test("A's completed upload is not used to send a message as B", async () => {
    const completion = deferred<any>();
    const base = post.getMockImplementation()!;
    post.mockImplementation((path: string, init: any) =>
      String(path).endsWith('/complete') ? completion.promise : base(path, init),
    );
    const { result } = await setup();

    act(() => {
      result.current.mutate(photo());
    });
    await waitFor(() => expect(completeCalls()).toHaveLength(1));

    switchAccount('B');
    await act(async () => {
      completion.resolve({ data: { id: 'media-1', status: 'ready' }, error: undefined });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(messagePosts()).toHaveLength(0); // no send with A's media id
    expect(outboxFor('B')).toHaveLength(0);
  });
});

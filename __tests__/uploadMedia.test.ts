// Tests for the media upload helpers (authorize -> transfer -> complete).
// Session safety: after every step (authorization, file read, transfer,
// completion, avatar assignment) the upload checks that the session that
// started it is still current, and stops before the next step if account A
// logged out and B (or A again) logged in.
// Resumability: progress is saved per stage under the client upload id, so a
// failed completion or avatar assignment is retried WITHOUT transferring the
// file again. The network and file system are mocked.
import { SessionChangedError } from '@/core/session/sessionOwner';
import { captureSessionOwner } from '@/core/session/sessionOwner';
import { api } from '@/services/api/client';
import { uploadProfileAvatar } from '@/services/media/profileAvatar';
import {
  assignProfileAvatar,
  discardUploadOperation,
  uploadMedia,
} from '@/services/media/uploadMedia';
import {
  findPendingUpload,
  useUploadOperationStore,
} from '@/services/media/uploadOperationStore';
import { clearPersisted, readPersisted } from '../test-utils/mmkvMock';
import { signIn, signOut, switchAccount } from '../test-utils/authSession';

jest.mock('@/core/storage/mmkv', () => require('../test-utils/mmkvMock'));
jest.mock('@/services/notifications', () =>
  require('../test-utils/authSession').notificationsMock(),
);
jest.mock('@/services/api/authSession', () =>
  require('../test-utils/authSession').authSessionMock(),
);
jest.mock('@/services/api/client', () => ({
  api: { POST: jest.fn(), PUT: jest.fn(), GET: jest.fn() },
}));
jest.mock('expo-file-system', () => require('../test-utils/fileSystemMock'));

const { File } = require('expo-file-system');

const post = api.POST as unknown as jest.Mock;
const put = api.PUT as unknown as jest.Mock;
const fetchMock = jest.fn();

const MEDIA = { uri: 'file:///cache/photo.jpg', mimeType: 'image/jpeg' };
const ok = (data: unknown) => ({ data, error: undefined });
const authorizationOk = () =>
  ok({
    media: { id: 'media-1' },
    upload: { url: 'https://upload.test', fields: { signature: 'sig' } },
  });
const completeOk = () => ok({ id: 'media-1', status: 'ready' });

const transferCalls = () =>
  fetchMock.mock.calls.filter(([url]) => url === 'https://upload.test');
const authorizeCalls = () =>
  post.mock.calls.filter(([path]) => path === '/v1/media/uploads');
const completeCalls = () =>
  post.mock.calls.filter(([path]) => String(path).endsWith('/complete'));

/** Happy-path network; individual tests override single steps. */
function mockNetwork() {
  post.mockImplementation(async (path: string) =>
    path === '/v1/media/uploads' ? authorizationOk() : completeOk(),
  );
  fetchMock.mockImplementation(async (url: string) =>
    url === 'https://upload.test'
      ? { ok: true, status: 200 }
      : { ok: true, blob: async () => new Blob(['x']) },
  );
}

const operations = () =>
  Object.values(useUploadOperationStore.getState().operations);

beforeEach(() => {
  clearPersisted();
  useUploadOperationStore.setState({ operations: {} });
  signOut();
  signIn('A');
  post.mockReset();
  put.mockReset();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  File.copies.length = 0;
  File.deleted.length = 0;
  File.failCopy = false;
  mockNetwork();
});

describe('a normal upload', () => {
  test('authorizes, transfers the bytes, then completes, in that order', async () => {
    const result = await uploadMedia(MEDIA, 'message_attachment', {
      owner: captureSessionOwner(),
    });

    expect(result).toMatchObject({ id: 'media-1', status: 'ready' });
    expect(authorizeCalls()).toHaveLength(1);
    expect(transferCalls()).toHaveLength(1);
    expect(completeCalls()).toHaveLength(1);
    expect(authorizeCalls()[0][1].body).toMatchObject({
      clientUploadId: result.clientUploadId,
      purpose: 'message_attachment',
      contentType: 'image/jpeg',
      sizeBytes: 1000,
    });
  });

  test('records progress per stage, owned by the account that started it', async () => {
    const result = await uploadMedia(MEDIA, 'message_attachment', {
      owner: captureSessionOwner(),
    });

    expect(operations()).toHaveLength(1);
    expect(operations()[0]).toMatchObject({
      accountId: 'A',
      clientUploadId: result.clientUploadId,
      stage: 'completed',
      mediaId: 'media-1',
    });
  });

  test('keeps a durable copy of the picked file for retries after a restart', async () => {
    await uploadMedia(MEDIA, 'message_attachment', {
      owner: captureSessionOwner(),
    });

    expect(File.copies).toHaveLength(1);
    expect(File.copies[0].from).toBe(MEDIA.uri);
    expect(File.copies[0].to).toContain('/pending-uploads/');
    expect(operations()[0].media.uri).toContain('/pending-uploads/');
  });

  test('still uploads from the original file if the durable copy fails', async () => {
    File.failCopy = true;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await uploadMedia(MEDIA, 'message_attachment', {
      owner: captureSessionOwner(),
    });
    warn.mockRestore();
    expect(operations()[0].media.uri).toBe(MEDIA.uri);
    expect(completeCalls()).toHaveLength(1);
  });

  test('skips the byte transfer when the server needs none', async () => {
    post.mockImplementation(async (path: string) =>
      path === '/v1/media/uploads'
        ? ok({ media: { id: 'media-1' }, upload: null })
        : completeOk(),
    );
    await uploadMedia(MEDIA, 'message_attachment', {
      owner: captureSessionOwner(),
    });
    expect(transferCalls()).toHaveLength(0);
    expect(completeCalls()).toHaveLength(1);
  });
});

describe('validation happens before anything is sent or stored', () => {
  test.each([
    ['an unsupported type', { ...MEDIA, mimeType: 'application/pdf' }, /JPEG, PNG, and WebP/],
    ['a file over 5 MB', { ...MEDIA, fileSize: 6 * 1024 * 1024 }, /5 MB or smaller/],
    ['an unknown size', { ...MEDIA, fileSize: 0 }, /size is unavailable/],
  ])('rejects %s', async (_label, media, message) => {
    await expect(
      uploadMedia(media, 'message_attachment', { owner: captureSessionOwner() }),
    ).rejects.toThrow(message);
    expect(post).not.toHaveBeenCalled();
    expect(operations()).toHaveLength(0);
  });

  test('refuses to upload when nobody is signed in', async () => {
    signOut();
    await expect(
      uploadMedia(MEDIA, 'message_attachment', { owner: captureSessionOwner() }),
    ).rejects.toThrow(SessionChangedError);
    expect(post).not.toHaveBeenCalled();
  });
});

describe('retrying resumes the failed stage instead of repeating a successful one', () => {
  test('a completion failure is retried without transferring the file again', async () => {
    let completions = 0;
    post.mockImplementation(async (path: string) => {
      if (path === '/v1/media/uploads') return authorizationOk();
      completions += 1;
      return completions === 1
        ? { data: undefined, error: { message: 'Try later' } }
        : completeOk();
    });
    const owner = captureSessionOwner();

    await expect(
      uploadMedia(MEDIA, 'message_attachment', { owner }),
    ).rejects.toThrow('Try later');
    const { clientUploadId, stage } = operations()[0];
    expect(stage).toBe('transferred'); // bytes arrived; only completion is left

    const result = await uploadMedia(MEDIA, 'message_attachment', {
      owner,
      clientUploadId,
    });

    expect(result).toMatchObject({ id: 'media-1', clientUploadId });
    expect(authorizeCalls()).toHaveLength(1); // not authorized again
    expect(transferCalls()).toHaveLength(1); // bytes NOT sent again
    expect(completeCalls()).toHaveLength(2);
    expect(completeCalls()[1][1].params.path.mediaId).toBe('media-1');
  });

  test('a failed transfer is retried with the same upload id (the idempotency key)', async () => {
    let transfers = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (url !== 'https://upload.test')
        return { ok: true, blob: async () => new Blob(['x']) };
      transfers += 1;
      return { ok: transfers > 1, status: 503 };
    });
    const owner = captureSessionOwner();

    await expect(
      uploadMedia(MEDIA, 'message_attachment', { owner }),
    ).rejects.toThrow('Media transfer failed (503)');
    const { clientUploadId } = operations()[0];

    await uploadMedia(MEDIA, 'message_attachment', { owner, clientUploadId });

    const ids = authorizeCalls().map(([, init]) => init.body.clientUploadId);
    expect(ids).toEqual([clientUploadId, clientUploadId]);
    expect(operations()).toHaveLength(1); // one record, not one per attempt
  });

  test('an upload that already completed returns immediately', async () => {
    const owner = captureSessionOwner();
    const first = await uploadMedia(MEDIA, 'message_attachment', { owner });
    post.mockClear();
    fetchMock.mockClear();

    const again = await uploadMedia(MEDIA, 'message_attachment', {
      owner,
      clientUploadId: first.clientUploadId,
    });

    expect(again.id).toBe(first.id);
    expect(post).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("another account cannot resume this account's upload", async () => {
    const first = await uploadMedia(MEDIA, 'message_attachment', {
      owner: captureSessionOwner(),
    });
    post.mockClear();

    switchAccount('B');
    await uploadMedia(MEDIA, 'message_attachment', {
      owner: captureSessionOwner(),
      clientUploadId: first.clientUploadId,
    });

    // B did not get A's completed result: it started its own upload.
    expect(authorizeCalls()).toHaveLength(1);
    expect(operations().map((o) => o.accountId).sort()).toEqual(['A', 'B']);
  });

  test('discardUploadOperation forgets the record and deletes the durable copy', async () => {
    const result = await uploadMedia(MEDIA, 'message_attachment', {
      owner: captureSessionOwner(),
    });
    discardUploadOperation('A', result.clientUploadId);

    expect(operations()).toHaveLength(0);
    expect(File.deleted.some((uri: string) => uri.includes('/pending-uploads/'))).toBe(true);
  });
});

describe('an upload stops if the session changes at any step', () => {
  // Each case switches account while the named step is "in flight". The upload
  // must reject and must not run any later step.
  const stages: [string, (switchNow: () => void) => void, () => number[]][] = [
    [
      'authorization',
      (switchNow) =>
        post.mockImplementation(async (path: string) => {
          if (path === '/v1/media/uploads') {
            switchNow();
            return authorizationOk();
          }
          return completeOk();
        }),
      () => [transferCalls().length, completeCalls().length],
    ],
    [
      'reading the file',
      (switchNow) =>
        fetchMock.mockImplementation(async (url: string) => {
          if (url === 'https://upload.test') return { ok: true, status: 200 };
          switchNow();
          return { ok: true, blob: async () => new Blob(['x']) };
        }),
      () => [transferCalls().length, completeCalls().length],
    ],
    [
      'the byte transfer',
      (switchNow) =>
        fetchMock.mockImplementation(async (url: string) => {
          if (url !== 'https://upload.test')
            return { ok: true, blob: async () => new Blob(['x']) };
          switchNow();
          return { ok: true, status: 200 };
        }),
      () => [completeCalls().length],
    ],
  ];

  test.each(stages)(
    'account switch during %s: nothing later runs',
    async (_stage, arrange, laterCalls) => {
      arrange(() => switchAccount('B'));

      await expect(
        uploadMedia(MEDIA, 'message_attachment', {
          owner: captureSessionOwner(),
        }),
      ).rejects.toThrow(SessionChangedError);

      expect(laterCalls().every((count) => count === 0)).toBe(true);
    },
  );

  test('re-login as the same account during completion does not return the old result', async () => {
    post.mockImplementation(async (path: string) => {
      if (path === '/v1/media/uploads') return authorizationOk();
      switchAccount('A'); // logout + login, same account id
      return completeOk();
    });

    await expect(
      uploadMedia(MEDIA, 'message_attachment', { owner: captureSessionOwner() }),
    ).rejects.toThrow(SessionChangedError);
    // The completed record is not written into the new session's view.
    expect(operations().every((o) => o.stage !== 'completed')).toBe(true);
  });

  test('the session ending aborts the in-flight requests themselves', async () => {
    let signal: AbortSignal | undefined;
    post.mockImplementation(async (path: string, init: any) => {
      if (path === '/v1/media/uploads') {
        signal = init.signal;
        return authorizationOk();
      }
      return completeOk();
    });
    await uploadMedia(MEDIA, 'message_attachment', {
      owner: captureSessionOwner(),
    });

    expect(signal).toBeDefined();
    expect(signal!.aborted).toBe(false);
    signOut();
    expect(signal!.aborted).toBe(true);
  });

  test('aborting from the caller (screen closed) stops the upload', async () => {
    const controller = new AbortController();
    post.mockImplementation(async (path: string) => {
      if (path === '/v1/media/uploads') {
        controller.abort(); // the screen closes during authorization
        return authorizationOk();
      }
      return completeOk();
    });

    await expect(
      uploadMedia(MEDIA, 'message_attachment', {
        owner: captureSessionOwner(),
        signal: controller.signal,
      }),
    ).rejects.toThrow();
    expect(transferCalls()).toHaveLength(0);
  });
});

describe('assignProfileAvatar', () => {
  test('assigns the media as the avatar and returns the updated profile', async () => {
    put.mockResolvedValue(ok({ id: 'A', avatarUrl: 'https://cdn/a.jpg' }));
    const user = await assignProfileAvatar('media-1', {
      owner: captureSessionOwner(),
    });
    expect(user).toMatchObject({ avatarUrl: 'https://cdn/a.jpg' });
    expect(put.mock.calls[0][1].body).toEqual({ mediaId: 'media-1' });
  });

  test('does not call the server if the session already ended', async () => {
    const owner = captureSessionOwner();
    switchAccount('B');
    await expect(assignProfileAvatar('media-1', { owner })).rejects.toThrow(
      SessionChangedError,
    );
    expect(put).not.toHaveBeenCalled();
  });

  test("does not hand back A's result if the session changed during the request", async () => {
    put.mockImplementation(async () => {
      switchAccount('B');
      return ok({ id: 'A', avatarUrl: 'https://cdn/a.jpg' });
    });
    await expect(
      assignProfileAvatar('media-1', { owner: captureSessionOwner() }),
    ).rejects.toThrow(SessionChangedError);
  });

  test('reports a server rejection', async () => {
    put.mockResolvedValue({ data: undefined, error: { message: 'Nope' } });
    await expect(
      assignProfileAvatar('media-1', { owner: captureSessionOwner() }),
    ).rejects.toThrow('Nope');
  });
});

describe('uploadProfileAvatar (upload + assign)', () => {
  test('a failed assignment is retried without uploading again', async () => {
    let assignments = 0;
    put.mockImplementation(async () => {
      assignments += 1;
      return assignments === 1
        ? { data: undefined, error: { message: 'Busy' } }
        : ok({ id: 'A', avatarUrl: 'https://cdn/a.jpg' });
    });
    const owner = captureSessionOwner();

    await expect(
      uploadProfileAvatar(MEDIA, { owner }),
    ).rejects.toThrow('Busy');
    const { clientUploadId, stage } = operations()[0];
    expect(stage).toBe('completed'); // uploaded and ready; only assignment failed

    const user = await uploadProfileAvatar(MEDIA, { owner, clientUploadId });

    expect(user).toMatchObject({ avatarUrl: 'https://cdn/a.jpg' });
    expect(authorizeCalls()).toHaveLength(1);
    expect(transferCalls()).toHaveLength(1);
    expect(completeCalls()).toHaveLength(1);
    expect(put).toHaveBeenCalledTimes(2);
  });

  test('forgets the upload record once the avatar is assigned', async () => {
    put.mockResolvedValue(ok({ id: 'A' }));
    await uploadProfileAvatar(MEDIA, { owner: captureSessionOwner() });
    expect(operations()).toHaveLength(0);
  });

  test("B's session never receives A's avatar result", async () => {
    put.mockImplementation(async () => {
      switchAccount('B');
      return ok({ id: 'A', avatarUrl: 'https://cdn/a.jpg' });
    });
    await expect(
      uploadProfileAvatar(MEDIA, { owner: captureSessionOwner() }),
    ).rejects.toThrow(SessionChangedError);
  });
});

describe('progress survives an app restart', () => {
  test('each stage is written to persistent storage', async () => {
    const owner = captureSessionOwner();
    post.mockImplementation(async (path: string) =>
      path === '/v1/media/uploads'
        ? authorizationOk()
        : { data: undefined, error: { message: 'Try later' } },
    );

    await expect(
      uploadMedia(MEDIA, 'message_attachment', { owner }),
    ).rejects.toThrow('Try later');

    const saved = Object.values(
      readPersisted('media-upload-operations').state.operations,
    ) as any[];
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      accountId: 'A',
      stage: 'transferred', // bytes arrived; completion is what is left
      mediaId: 'media-1',
      purpose: 'message_attachment',
    });
    expect(saved[0].media.uri).toContain('/pending-uploads/');
  });
});

describe('findPendingUpload (resume after a failure or restart)', () => {
  const save = (overrides = {}) =>
    useUploadOperationStore.getState().save({
      accountId: 'A',
      clientUploadId: 'u1',
      purpose: 'profile_avatar',
      media: { uri: 'file:///documents/pending-uploads/a.jpg' },
      stage: 'transferred',
      createdAt: '2026-11-18T10:00:00.000Z',
      ...overrides,
    });

  test('returns the newest unfinished upload for this account and purpose', () => {
    save({ clientUploadId: 'old', createdAt: '2026-11-18T09:00:00.000Z' });
    save({ clientUploadId: 'new', createdAt: '2026-11-18T10:00:00.000Z' });

    expect(findPendingUpload('A', 'profile_avatar')?.clientUploadId).toBe('new');
  });

  test("ignores another account's uploads and other purposes", () => {
    save({ accountId: 'B', clientUploadId: 'b-upload' });
    save({ purpose: 'message_attachment', clientUploadId: 'chat-upload' });

    expect(findPendingUpload('A', 'profile_avatar')).toBeUndefined();
  });

  test('returns nothing when signed out', () => {
    save();
    expect(findPendingUpload(undefined, 'profile_avatar')).toBeUndefined();
  });
});

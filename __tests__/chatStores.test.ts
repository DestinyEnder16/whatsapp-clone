import { useChatDraftStore } from '@/features/chat/store/useChatDraftStore';
import { useMessageOutboxStore } from '@/features/chat/store/useMessageOutboxStore';
import { clearPersisted, readPersisted } from '../test-utils/mmkvMock';

jest.mock('@/core/storage/mmkv', () => require('../test-utils/mmkvMock'));

beforeEach(() => {
  clearPersisted();
  useChatDraftStore.setState({ drafts: {} });
  useMessageOutboxStore.setState({ messages: {} });
});

describe('useChatDraftStore', () => {
  test('stores a draft per account and conversation', () => {
    const { setDraft } = useChatDraftStore.getState();
    setDraft('A', 'c1', 'hello');
    setDraft('A', 'c2', 'other chat');
    setDraft('B', 'c1', 'other account');

    expect(useChatDraftStore.getState().drafts).toEqual({
      'A:c1': 'hello',
      'A:c2': 'other chat',
      'B:c1': 'other account',
    });
  });

  test('overwrites the previous draft for the same chat', () => {
    const { setDraft } = useChatDraftStore.getState();
    setDraft('A', 'c1', 'first');
    setDraft('A', 'c1', 'second');
    expect(useChatDraftStore.getState().drafts['A:c1']).toBe('second');
  });

  test("clearing one draft leaves other chats and accounts alone", () => {
    const { setDraft, clearDraft } = useChatDraftStore.getState();
    setDraft('A', 'c1', 'keep me');
    setDraft('A', 'c2', 'remove me');
    setDraft('B', 'c2', 'other account');

    clearDraft('A', 'c2');

    expect(useChatDraftStore.getState().drafts).toEqual({
      'A:c1': 'keep me',
      'B:c2': 'other account',
    });
  });

  test('clearing a draft that does not exist is harmless', () => {
    expect(() =>
      useChatDraftStore.getState().clearDraft('A', 'missing'),
    ).not.toThrow();
    expect(useChatDraftStore.getState().drafts).toEqual({});
  });

  test('drafts are saved to persistent storage so they survive a restart', () => {
    useChatDraftStore.getState().setDraft('A', 'c1', 'unsent');
    expect(readPersisted('chat-drafts').state.drafts).toEqual({
      'A:c1': 'unsent',
    });
  });
});

describe('useMessageOutboxStore', () => {
  const pending = (overrides = {}) => ({
    accountId: 'A',
    conversationId: 'c1',
    clientMessageId: 'm1',
    text: 'hi',
    createdAt: '2026-11-18T10:00:00.000Z',
    status: 'pending' as const,
    ...overrides,
  });

  test('save keeps a message under account, conversation and client id', () => {
    useMessageOutboxStore.getState().save(pending());
    expect(Object.keys(useMessageOutboxStore.getState().messages)).toEqual([
      'A:c1:m1',
    ]);
  });

  test('saving the same client id again replaces it instead of duplicating', () => {
    const { save } = useMessageOutboxStore.getState();
    save(pending({ text: 'first' }));
    save(pending({ text: 'edited' }));

    const messages = useMessageOutboxStore.getState().messages;
    expect(Object.keys(messages)).toHaveLength(1);
    expect(messages['A:c1:m1'].text).toBe('edited');
  });

  test('the same client id in another account or chat is a separate entry', () => {
    const { save } = useMessageOutboxStore.getState();
    save(pending());
    save(pending({ accountId: 'B' }));
    save(pending({ conversationId: 'c2' }));
    expect(Object.keys(useMessageOutboxStore.getState().messages).sort()).toEqual([
      'A:c1:m1',
      'A:c2:m1',
      'B:c1:m1',
    ]);
  });

  test('markFailed flips status and keeps the content for a retry', () => {
    const { save, markFailed } = useMessageOutboxStore.getState();
    save(pending({ attachmentMediaIds: ['media-1'] }));

    markFailed('A', 'c1', 'm1');

    expect(useMessageOutboxStore.getState().messages['A:c1:m1']).toMatchObject({
      status: 'failed',
      text: 'hi',
      attachmentMediaIds: ['media-1'],
      clientMessageId: 'm1',
    });
  });

  test('markFailed ignores a message that is not in the outbox', () => {
    const before = useMessageOutboxStore.getState().messages;
    useMessageOutboxStore.getState().markFailed('A', 'c1', 'ghost');
    expect(useMessageOutboxStore.getState().messages).toBe(before);
  });

  test('remove deletes only the matching message', () => {
    const { save, remove } = useMessageOutboxStore.getState();
    save(pending());
    save(pending({ clientMessageId: 'm2' }));

    remove('A', 'c1', 'm1');

    expect(Object.keys(useMessageOutboxStore.getState().messages)).toEqual([
      'A:c1:m2',
    ]);
  });

  test('unsent messages are saved to persistent storage so they survive a restart', () => {
    useMessageOutboxStore.getState().save(pending());
    expect(readPersisted('chat-message-outbox').state.messages['A:c1:m1'])
      .toMatchObject({ status: 'pending', text: 'hi' });
  });
});

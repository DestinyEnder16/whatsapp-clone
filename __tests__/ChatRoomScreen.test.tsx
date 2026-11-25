// Tests for the chat room screen (ChatRoomScreen).
// F8: the room must not trust the route for who the conversation is with. It
// loads the conversation by its ID, shows loading / invalid-ID / access-denied /
// not-found / load-failed screens (each with a way back or a retry), and does not
// allow sending until the conversation has loaded. It also tells an EMPTY chat
// apart from a history that FAILED to load, and shows a failed message with a way
// to retry it. The back button falls back to the chat list when there is no
// history (a cold link or notification). The HTTP client, router, socket and
// storage are mocked; the real screen, hooks, stores and React Query are used.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { queryClient } from '@/core/lib/queryClient';
import { ChatRoomScreen } from '@/features/chat/screens/ChatRoomScreen';
import { useMessageOutboxStore } from '@/features/chat/store/useMessageOutboxStore';
import { useChatDraftStore } from '@/features/chat/store/useChatDraftStore';
import { api } from '@/services/api/client';
import { deferred } from '../test-utils/deferred';
import { clearPersisted } from '../test-utils/mmkvMock';
import { signIn, signOut } from '../test-utils/authSession';
import { deliverQueryUpdatesInsideAct } from '../test-utils/reactQuery';
import { QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/core/storage/mmkv', () => require('../test-utils/mmkvMock'));
jest.mock('@/services/notifications', () =>
  require('../test-utils/authSession').notificationsMock(),
);
jest.mock('@/services/api/authSession', () =>
  require('../test-utils/authSession').authSessionMock(),
);
jest.mock('@/services/api/client', () => ({
  api: { GET: jest.fn(), POST: jest.fn(), PUT: jest.fn() },
}));
jest.mock('expo-file-system', () => require('../test-utils/fileSystemMock'));
jest.mock('react-native-reanimated', () =>
  require('../test-utils/reanimatedMock'),
);
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    connected: true,
    on: jest.fn(),
    emit: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
}));

// The route. `name` is deliberately wrong to prove it is not trusted.
let mockParams: Record<string, string> = {};
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  router: {
    back: jest.fn(),
    replace: jest.fn(),
    push: jest.fn(),
    canGoBack: () => mockCanGoBack,
  },
}));

const get = api.GET as unknown as jest.Mock;
const post = api.POST as unknown as jest.Mock;

const ID = '3f2b8c1e-7d44-4a1e-9b0a-1c2d3e4f5a6b';

const conversation = (overrides = {}) => ({
  id: ID,
  type: 'direct',
  otherParticipant: { id: 'u2', displayName: 'Samuel', avatarUrl: null },
  unreadCount: 0,
  settings: { muted: false },
  latestMessage: null,
  updatedAt: '2026-11-18T09:00:00.000Z',
  ...overrides,
});
const message = (clientMessageId: string, extra = {}) => ({
  id: `server-${clientMessageId}`,
  conversationId: ID,
  clientMessageId,
  senderId: 'u2',
  kind: 'text',
  text: 'Hello from Samuel',
  attachments: [],
  createdAt: '2026-11-18T10:00:00.000Z',
  ...extra,
});
const page = (items: any[]) => ({
  items,
  pageInfo: { nextCursor: null, hasNextPage: false },
});

type Route = 'conversation' | 'messages' | 'receipts';
/** Route a mocked GET by URL so each endpoint can succeed or fail separately. */
function mockApi(handlers: Partial<Record<Route, () => any>>) {
  get.mockImplementation(async (path: string) => {
    const key: Route | undefined = path.endsWith('/messages')
      ? 'messages'
      : path.endsWith('/receipts')
        ? 'receipts'
        : path === '/v1/conversations/{conversationId}'
          ? 'conversation'
          : undefined;
    const handler = key && handlers[key];
    if (!handler) return { data: { conversationId: ID, items: [] }, error: undefined };
    return handler();
  });
}
const okConversation = () => ({ data: conversation(), error: undefined });
const okMessages = (items: any[] = []) => () => ({
  data: page(items),
  error: undefined,
});
const httpError = (status: number, message?: string) => () => ({
  data: undefined,
  error: message ? { message } : {},
  response: { status },
});

const renderRoom = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <ChatRoomScreen />
    </QueryClientProvider>,
  );

const conversationCalls = () =>
  get.mock.calls.filter(([p]) => p === '/v1/conversations/{conversationId}');
const messageCalls = () => get.mock.calls.filter(([p]) => String(p).endsWith('/messages'));
// Opening a room also marks it read (a different POST); only count message sends.
const sendCalls = () =>
  post.mock.calls.filter(([p]) => p === '/v1/conversations/{conversationId}/messages');

beforeAll(() => {
  deliverQueryUpdatesInsideAct();
  queryClient.setDefaultOptions({
    queries: { retry: false, retryDelay: 0, gcTime: Infinity },
    mutations: { retry: false, gcTime: Infinity },
  });
});

beforeEach(() => {
  clearPersisted();
  useMessageOutboxStore.setState({ messages: {} });
  useChatDraftStore.setState({ drafts: {} });
  queryClient.clear();
  get.mockReset();
  post.mockReset();
  (router.back as jest.Mock).mockClear();
  (router.replace as jest.Mock).mockClear();
  mockParams = { id: ID };
  mockCanGoBack = true;
  signOut();
  signIn('me');
  mockApi({ conversation: okConversation, messages: okMessages() });
});

afterAll(() => {
  queryClient.clear();
});

describe('who the conversation is with comes from the backend, not the route', () => {
  test('shows the participant loaded by ID and ignores a name in the route', async () => {
    mockParams = { id: ID, name: 'Spoofed Name', avatarUrl: 'https://evil/x.png' };
    await renderRoom();

    expect(await screen.findByText('Samuel')).toBeOnTheScreen();
    expect(screen.queryByText('Spoofed Name')).toBeNull();
    expect(conversationCalls()).toHaveLength(1);
  });

  test('shows a loading screen, with no placeholder identity, while it resolves', async () => {
    const pending = deferred<any>();
    mockApi({ conversation: () => pending.promise, messages: okMessages() });
    await renderRoom();

    expect(await screen.findByText('Loading conversation...')).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText('Type a message...')).toBeNull();
    expect(screen.queryByText('Conversation')).toBeNull();
    expect(screen.queryByText('Chat')).toBeNull();

    await act(async () => {
      pending.resolve(okConversation());
    });
    expect(await screen.findByText('Samuel')).toBeOnTheScreen();
  });

  test('shows a group by its name', async () => {
    mockApi({
      conversation: () => ({
        data: conversation({ type: 'group', name: 'Project Team', otherParticipant: undefined }),
        error: undefined,
      }),
      messages: okMessages(),
    });
    await renderRoom();

    expect(await screen.findByText('Project Team')).toBeOnTheScreen();
  });
});

describe('recovery screens for a conversation that cannot be opened', () => {
  test.each([
    ['not a uuid', 'abc'],
    ['whitespace', '   '],
    ['a path-like value', '../../settings'],
  ])('a malformed id (%s) shows "Invalid Conversation Link" and loads nothing', async (_l, id) => {
    mockParams = { id };
    await renderRoom();

    expect(await screen.findByText('Invalid Conversation Link')).toBeOnTheScreen();
    expect(conversationCalls()).toHaveLength(0);
    expect(messageCalls()).toHaveLength(0);
    expect(screen.queryByPlaceholderText('Type a message...')).toBeNull();
  });

  test('a missing id shows the invalid-link screen', async () => {
    mockParams = {};
    await renderRoom();
    expect(await screen.findByText('Invalid Conversation Link')).toBeOnTheScreen();
  });

  test('an inaccessible conversation (403) shows "Access Denied" and no composer', async () => {
    mockApi({ conversation: httpError(403), messages: okMessages() });
    await renderRoom();

    expect(await screen.findByText('Access Denied')).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText('Type a message...')).toBeNull();
    expect(conversationCalls()).toHaveLength(1); // 403 is not retried
  });

  test('a missing conversation (404) shows "Conversation Not Found"', async () => {
    mockApi({ conversation: httpError(404), messages: okMessages() });
    await renderRoom();

    expect(await screen.findByText('Conversation Not Found')).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText('Type a message...')).toBeNull();
  });

  test('a network failure shows "Could Not Load Conversation" and Retry loads it', async () => {
    // The first attempt and the hook's two automatic retries fail; the user's
    // Retry (the 4th request) succeeds.
    let attempts = 0;
    mockApi({
      conversation: () =>
        ++attempts <= 3
          ? { data: undefined, error: { message: 'Network request failed' }, response: { status: 503 } }
          : okConversation(),
      messages: okMessages(),
    });
    await renderRoom();

    expect(await screen.findByText('Could Not Load Conversation')).toBeOnTheScreen();
    expect(screen.getByText('Network request failed')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Retry loading conversation'));

    expect(await screen.findByText('Samuel')).toBeOnTheScreen();
    expect(conversationCalls()).toHaveLength(4);
  });

  test.each([
    ['invalid link', () => { mockParams = { id: 'abc' }; }],
    ['access denied', () => mockApi({ conversation: httpError(403), messages: okMessages() })],
    ['not found', () => mockApi({ conversation: httpError(404), messages: okMessages() })],
  ])('the %s screen has a way back to the chat list', async (_label, arrange) => {
    arrange();
    await renderRoom();

    fireEvent.press(await screen.findByLabelText('Back to chats'));

    expect(router.back).toHaveBeenCalledTimes(1);
  });
});

describe('back navigation', () => {
  test('goes back when there is history', async () => {
    await renderRoom();
    fireEvent.press((await screen.findAllByLabelText('Back to chats'))[0]);
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test('falls back to the chat list for a cold link or notification with no history', async () => {
    mockCanGoBack = false;
    await renderRoom();

    fireEvent.press((await screen.findAllByLabelText('Back to chats'))[0]);

    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    expect(router.back).not.toHaveBeenCalled();
  });

  test('the same fallback applies on the invalid-link screen', async () => {
    mockCanGoBack = false;
    mockParams = { id: 'abc' };
    await renderRoom();

    fireEvent.press(await screen.findByLabelText('Back to chats'));

    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });
});

describe('an empty conversation is not a failed one', () => {
  test('a conversation with no messages says there are none yet', async () => {
    await renderRoom();

    expect(await screen.findByText(/No messages yet/)).toBeOnTheScreen();
    expect(screen.queryByText('Could not load messages')).toBeNull();
  });

  test('a history that fails to load says so, with Retry, and does not say "No messages yet"', async () => {
    mockApi({
      conversation: okConversation,
      messages: httpError(500, 'Server exploded'),
    });
    await renderRoom();

    expect(await screen.findByText('Could not load messages')).toBeOnTheScreen();
    expect(screen.getByText('Server exploded')).toBeOnTheScreen();
    expect(screen.queryByText(/No messages yet/)).toBeNull();
  });

  test('Retry reloads the history', async () => {
    let attempts = 0;
    mockApi({
      conversation: okConversation,
      messages: () =>
        ++attempts === 1
          ? { data: undefined, error: { message: 'Server exploded' } }
          : { data: page([message('m1')]), error: undefined },
    });
    await renderRoom();

    fireEvent.press(await screen.findByLabelText('Retry loading messages'));

    expect(await screen.findByLabelText(/Hello from Samuel/)).toBeOnTheScreen();
    expect(messageCalls()).toHaveLength(2);
    expect(screen.queryByText('Could not load messages')).toBeNull();
  });

  test('loaded messages are shown', async () => {
    mockApi({ conversation: okConversation, messages: okMessages([message('m1')]) });
    await renderRoom();

    expect(await screen.findByLabelText(/Contact, .*Hello from Samuel/)).toBeOnTheScreen();
  });
});

describe('sending only after the conversation has loaded', () => {
  test('there is no composer while the conversation is still loading', async () => {
    const pending = deferred<any>();
    mockApi({ conversation: () => pending.promise, messages: okMessages() });
    await renderRoom();

    await screen.findByText('Loading conversation...');
    expect(screen.queryByPlaceholderText('Type a message...')).toBeNull();
    expect(sendCalls()).toHaveLength(0);

    await act(async () => {
      pending.resolve(okConversation());
    });
    expect(await screen.findByPlaceholderText('Type a message...')).toBeOnTheScreen();
  });

  test('sends the trimmed text to the resolved conversation', async () => {
    post.mockImplementation(async (_p: string, init: any) => ({
      data: message(init.body.clientMessageId, { senderId: 'me', text: 'On my way' }),
      error: undefined,
    }));
    await renderRoom();

    const input = await screen.findByPlaceholderText('Type a message...');
    fireEvent.changeText(input, '  On my way  ');
    fireEvent.press(screen.getByLabelText('Send message'));

    await waitFor(() => expect(sendCalls()).toHaveLength(1));
    expect(sendCalls()[0][1].params.path.conversationId).toBe(ID);
    expect(sendCalls()[0][1].body.text).toBe('On my way');
  });

  test('does not send an empty message', async () => {
    await renderRoom();
    const input = await screen.findByPlaceholderText('Type a message...');
    fireEvent.changeText(input, '   ');

    fireEvent.press(screen.getByLabelText('Send message'));

    expect(sendCalls()).toHaveLength(0);
  });
});

describe('a failed message can be found and retried', () => {
  const failedEntry = () => ({
    accountId: 'me',
    conversationId: ID,
    clientMessageId: 'unsent-1',
    text: 'I never sent this',
    createdAt: '2026-11-18T11:00:00.000Z',
    status: 'failed' as const,
  });

  test('shows the failed message even when history cannot load, with a Retry action', async () => {
    useMessageOutboxStore.setState({
      messages: { [`me:${ID}:unsent-1`]: failedEntry() },
    });
    mockApi({ conversation: okConversation, messages: httpError(500, 'Offline') });
    await renderRoom();

    // The failed message is announced as failed (not hidden behind an error).
    const bubble = await screen.findByLabelText(/I never sent this.*Failed to send/);
    expect(bubble).toBeOnTheScreen();
    expect(screen.queryByText('Could not load messages')).toBeNull();
  });

  test('activating Retry resends it with the same message id', async () => {
    useMessageOutboxStore.setState({
      messages: { [`me:${ID}:unsent-1`]: failedEntry() },
    });
    mockApi({ conversation: okConversation, messages: httpError(500, 'Offline') });
    post.mockImplementation(async (_p: string, init: any) => ({
      data: message(init.body.clientMessageId, { senderId: 'me', text: 'I never sent this' }),
      error: undefined,
    }));
    await renderRoom();

    const bubble = await screen.findByLabelText(/I never sent this.*Failed to send/);
    // The screen-reader "Retry sending message" action on the bubble.
    fireEvent(bubble, 'accessibilityAction', { nativeEvent: { actionName: 'retry' } });

    await waitFor(() => expect(sendCalls()).toHaveLength(1));
    expect(sendCalls()[0][1].body).toMatchObject({
      clientMessageId: 'unsent-1',
      text: 'I never sent this',
    });
  });
});

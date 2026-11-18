// Tests for push-notification routing to a chat.
// Checks that a conversation ID is accepted only when it is a valid UUID (not
// any non-empty string, which previously let whitespace through), that it is
// found in the payload fields or links the backend may use, and that tapping a
// notification opens the chat immediately for a signed-in user with a finished
// profile, but is kept for later (and survives an app restart) when signed out
// or the profile is unfinished. Router, storage and push are mocked.
import type * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useNavigationStore } from '@/core/store/useNavigationStore';
import {
  extractConversationId,
  handleNotificationResponse,
  isValidUuid,
} from '@/services/notifications/notificationNavigation';
import { clearPersisted, readPersisted } from '../test-utils/mmkvMock';
import { signIn, signOut } from '../test-utils/authSession';

jest.mock('@/core/storage/mmkv', () => require('../test-utils/mmkvMock'));
jest.mock('@/services/notifications', () =>
  require('../test-utils/authSession').notificationsMock(),
);
jest.mock('@/services/api/authSession', () =>
  require('../test-utils/authSession').authSessionMock(),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));
jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
  clearLastNotificationResponseAsync: jest.fn(),
}));

const ID = '3f2b8c1e-7d44-4a1e-9b0a-1c2d3e4f5a6b';
const OTHER = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

const responseWith = (data: Record<string, unknown> | undefined) =>
  ({
    notification: { request: { content: { data } } },
  }) as unknown as Notifications.NotificationResponse;

const hydrate = (profileComplete: boolean) =>
  useAuthStore.setState({
    hasHydrated: true,
    isAuthenticated: true,
    user: { id: 'A', profileComplete } as any,
  });

beforeEach(() => {
  clearPersisted();
  (router.push as jest.Mock).mockClear();
  signOut();
  useAuthStore.setState({ hasHydrated: true });
  useNavigationStore.setState({ pendingDestination: null });
});

describe('isValidUuid', () => {
  test.each([[ID], [ID.toUpperCase()], [`  ${ID}  `]])('accepts %p', (id) => {
    expect(isValidUuid(id)).toBe(true);
  });

  test.each([
    [undefined],
    [null],
    [''],
    ['   '],
    ['not-a-uuid'],
    [`${ID}-extra`],
    [ID.slice(0, -1)],
    [ID.replace(/-/g, '')],
  ])('rejects %p', (id) => {
    expect(isValidUuid(id as any)).toBe(false);
  });
});

describe('extractConversationId', () => {
  test('reads conversationId', () => {
    expect(extractConversationId({ conversationId: ID })).toBe(ID);
  });

  test('trims surrounding whitespace around a valid id', () => {
    expect(extractConversationId({ conversationId: ` ${ID} ` })).toBe(ID);
  });

  test.each([['chat'], ['message'], ['conversation']])(
    'reads a generic id when the payload type is %s',
    (type) => {
      expect(extractConversationId({ id: ID, type })).toBe(ID);
    },
  );

  test('ignores a generic id of another type', () => {
    expect(extractConversationId({ id: ID, type: 'call' })).toBeNull();
  });

  test.each([
    [`/chat/${ID}`],
    [`whatsappclone:///chat/${ID}`],
  ])('reads the id from a link in url / path: %s', (link) => {
    expect(extractConversationId({ url: link })).toBe(ID);
    expect(extractConversationId({ path: link })).toBe(ID);
  });

  test.each([
    ['null', null],
    ['no data', undefined],
    ['empty data', {}],
    ['an empty id', { conversationId: '' }],
    ['a whitespace id', { conversationId: '   ' }],
    ['a non-uuid id', { conversationId: 'abc' }],
    ['a numeric id', { conversationId: 123 }],
    ['a malformed link', { url: '/chat/not-a-uuid' }],
  ])('returns null for %s', (_label, data) => {
    expect(extractConversationId(data as any)).toBeNull();
  });
});

describe('handleNotificationResponse', () => {
  test('opens the chat right away for a signed-in user with a finished profile', async () => {
    hydrate(true);

    await handleNotificationResponse(responseWith({ conversationId: ID }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/chat/[id]',
      params: { id: ID },
    });
    expect(useNavigationStore.getState().pendingDestination).toBeNull();
  });

  test('keeps the exact chat for later when signed out', async () => {
    await handleNotificationResponse(responseWith({ conversationId: ID }));

    expect(router.push).not.toHaveBeenCalled();
    expect(useNavigationStore.getState().pendingDestination).toMatchObject({
      conversationId: ID,
      pathname: `/chat/${ID}`,
    });
  });

  test('keeps the chat for later when the profile is not finished', async () => {
    hydrate(false);

    await handleNotificationResponse(responseWith({ conversationId: ID }));

    expect(router.push).not.toHaveBeenCalled();
    expect(useNavigationStore.getState().pendingDestination?.conversationId).toBe(ID);
  });

  test('keeps the chat for later while auth is still being restored', async () => {
    hydrate(true);
    useAuthStore.setState({ hasHydrated: false });

    await handleNotificationResponse(responseWith({ conversationId: ID }));

    expect(router.push).not.toHaveBeenCalled();
    expect(useNavigationStore.getState().pendingDestination?.conversationId).toBe(ID);
  });

  test.each([
    ['whitespace', '   '],
    ['not a uuid', 'abc'],
    ['empty', ''],
  ])('ignores a notification whose conversation id is %s', async (_l, id) => {
    hydrate(true);

    await handleNotificationResponse(responseWith({ conversationId: id }));

    expect(router.push).not.toHaveBeenCalled();
    expect(useNavigationStore.getState().pendingDestination).toBeNull();
  });

  test('ignores a missing response or payload', async () => {
    hydrate(true);
    await handleNotificationResponse(null);
    await handleNotificationResponse(responseWith(undefined));
    expect(router.push).not.toHaveBeenCalled();
  });

  test('a newer saved destination replaces an older one', async () => {
    await handleNotificationResponse(responseWith({ conversationId: ID }));
    await handleNotificationResponse(responseWith({ conversationId: OTHER }));

    expect(useNavigationStore.getState().pendingDestination?.conversationId).toBe(OTHER);
  });
});

describe('the saved destination (useNavigationStore)', () => {
  test('is consumed exactly once', () => {
    useNavigationStore.getState().setPendingConversationId(ID);

    expect(useNavigationStore.getState().consumePendingDestination()).toMatchObject({
      conversationId: ID,
    });
    expect(useNavigationStore.getState().consumePendingDestination()).toBeNull();
  });

  test('survives an app restart because it is persisted', () => {
    useNavigationStore.getState().setPendingConversationId(ID);
    expect(readPersisted('navigation-store').state.pendingDestination).toMatchObject({
      conversationId: ID,
    });
  });

  test('is cleared by logout so the next account is not sent there', () => {
    signIn('A');
    useNavigationStore.getState().setPendingConversationId(ID);

    signOut();

    expect(useNavigationStore.getState().pendingDestination).toBeNull();
  });
});

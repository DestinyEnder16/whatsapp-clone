import type * as Notifications from 'expo-notifications';
import {
  consumePendingChatDestination,
  getChatDestinationFromNotification,
  setPendingChatDestination,
} from '@/services/notifications/notificationNavigation';

const responseWith = (data: Record<string, unknown> | undefined) =>
  ({
    notification: { request: { content: { data } } },
  }) as unknown as Notifications.NotificationResponse;

describe('getChatDestinationFromNotification', () => {
  test('reads the conversation and display details from the payload', () => {
    expect(
      getChatDestinationFromNotification(
        responseWith({
          conversationId: 'c1',
          name: 'Samuel',
          avatarUrl: 'https://img/a.png',
          otherParticipantId: 'u2',
        }),
      ),
    ).toEqual({
      conversationId: 'c1',
      name: 'Samuel',
      avatarUrl: 'https://img/a.png',
      otherParticipantId: 'u2',
    });
  });

  test('accepts the snake_case conversation_id key', () => {
    expect(
      getChatDestinationFromNotification(
        responseWith({ conversation_id: 'c9' }),
      ),
    ).toMatchObject({ conversationId: 'c9' });
  });

  test('ignores optional fields that are not strings', () => {
    const result = getChatDestinationFromNotification(
      responseWith({
        conversationId: 'c1',
        name: 42,
        avatarUrl: {},
        otherParticipantId: null,
      }),
    );
    expect(result).toEqual({
      conversationId: 'c1',
      name: undefined,
      avatarUrl: undefined,
      otherParticipantId: undefined,
    });
  });

  test.each([
    ['no data', undefined],
    ['empty data', {}],
    ['empty conversation id', { conversationId: '' }],
    ['numeric conversation id', { conversationId: 123 }],
  ])('returns null for %s', (_label, data) => {
    expect(getChatDestinationFromNotification(responseWith(data))).toBeNull();
  });
});

describe('pending chat destination', () => {
  test('is consumed exactly once', () => {
    setPendingChatDestination({ conversationId: 'c1' });
    expect(consumePendingChatDestination()).toEqual({ conversationId: 'c1' });
    expect(consumePendingChatDestination()).toBeNull();
  });

  test('a newer destination replaces an unconsumed one', () => {
    setPendingChatDestination({ conversationId: 'old' });
    setPendingChatDestination({ conversationId: 'new' });
    expect(consumePendingChatDestination()).toEqual({ conversationId: 'new' });
  });

  test('is null when nothing is pending', () => {
    expect(consumePendingChatDestination()).toBeNull();
  });
});

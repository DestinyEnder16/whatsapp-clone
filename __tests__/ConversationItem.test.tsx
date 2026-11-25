// Tests for the ConversationItem component (one row in the chat list).
// Checks the name and initial (with "Contact"/"Group" fallbacks), the message
// preview (including the "You:" prefix), the time label, the unread badge
// (including "99+"), and that tapping the row calls onPress.

import { render, screen, userEvent } from '@testing-library/react-native';
import { ConversationItem } from '@/features/chat/components/ConversationItem';

// Boundaries replaced: storage (theme is persisted) and the auth store.
// The component, theme hook, AppText and date formatting are all real.
jest.mock('@/core/storage/mmkv', () => require('../test-utils/mmkvMock'));
jest.mock('@/core/store/useAuthStore', () => {
  const { create } = require('zustand');
  return { useAuthStore: create(() => ({ user: { id: 'me' } })) };
});

const NOW = new Date(2026, 10, 18, 12, 0, 0);

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  jest.setSystemTime(NOW);
});
afterEach(() => {
  jest.useRealTimers();
});

const direct = (overrides: Record<string, any> = {}) =>
  ({
    id: 'c1',
    type: 'direct',
    otherParticipant: { id: 'u2', displayName: 'Samuel', avatarUrl: null },
    unreadCount: 0,
    settings: { muted: false },
    latestMessage: null,
    updatedAt: new Date(2026, 10, 17, 9, 0).toISOString(),
    ...overrides,
  }) as any;

const group = (overrides: Record<string, any> = {}) =>
  ({
    id: 'g1',
    type: 'group',
    name: 'Project Team',
    avatarUrl: null,
    unreadCount: 0,
    settings: { muted: false },
    latestMessage: null,
    updatedAt: new Date(2026, 10, 17, 9, 0).toISOString(),
    ...overrides,
  }) as any;

describe('name and avatar', () => {
  test('shows the other participant and their initial', async () => {
    await render(<ConversationItem item={direct()} />);
    expect(screen.getByText('Samuel')).toBeOnTheScreen();
    expect(screen.getByText('S')).toBeOnTheScreen();
  });

  test('upper-cases the initial', async () => {
    await render(
      <ConversationItem
        item={direct({ otherParticipant: { displayName: 'amaka' } })}
      />,
    );
    expect(screen.getByText('A')).toBeOnTheScreen();
  });

  test.each([
    ['blank', '   '],
    ['missing', undefined],
  ])('falls back to "Contact" when the display name is %s', async (_l, name) => {
    await render(
      <ConversationItem
        item={direct({ otherParticipant: { displayName: name } })}
      />,
    );
    expect(screen.getByText('Contact')).toBeOnTheScreen();
  });

  test('shows a group by its name', async () => {
    await render(<ConversationItem item={group()} />);
    expect(screen.getByText('Project Team')).toBeOnTheScreen();
  });

  test('falls back to "Group" for an unnamed group', async () => {
    await render(<ConversationItem item={group({ name: '' })} />);
    expect(screen.getByText('Group')).toBeOnTheScreen();
  });
});

describe('message preview', () => {
  test('says there are no messages yet for an empty conversation', async () => {
    await render(<ConversationItem item={direct()} />);
    expect(screen.getByText('No messages yet')).toBeOnTheScreen();
  });

  test('shows the other person\'s message as it is', async () => {
    await render(
      <ConversationItem
        item={direct({
          latestMessage: {
            preview: 'See you at 5',
            senderId: 'u2',
            createdAt: NOW.toISOString(),
          },
        })}
      />,
    );
    expect(screen.getByText('See you at 5')).toBeOnTheScreen();
  });

  test('prefixes your own message with "You:"', async () => {
    await render(
      <ConversationItem
        item={direct({
          latestMessage: {
            preview: 'On my way',
            senderId: 'me',
            createdAt: NOW.toISOString(),
          },
        })}
      />,
    );
    expect(screen.getByText('You: On my way')).toBeOnTheScreen();
  });
});

describe('time', () => {
  test('shows "Yesterday" for a message from yesterday', async () => {
    await render(
      <ConversationItem
        item={direct({
          latestMessage: {
            preview: 'hi',
            senderId: 'u2',
            createdAt: new Date(2026, 10, 17, 20, 0).toISOString(),
          },
        })}
      />,
    );
    expect(screen.getByText('Yesterday')).toBeOnTheScreen();
  });

  test('falls back to the conversation update time when there is no message', async () => {
    await render(<ConversationItem item={direct()} />);
    expect(screen.getByText('Yesterday')).toBeOnTheScreen();
  });
});

describe('unread badge', () => {
  test('is hidden when everything is read', async () => {
    await render(<ConversationItem item={direct({ unreadCount: 0 })} />);
    expect(screen.queryByText('0')).toBeNull();
  });

  test('shows the unread count', async () => {
    await render(<ConversationItem item={direct({ unreadCount: 3 })} />);
    expect(screen.getByText('3')).toBeOnTheScreen();
  });

  test('caps a large count at 99+', async () => {
    await render(<ConversationItem item={direct({ unreadCount: 250 })} />);
    expect(screen.getByText('99+')).toBeOnTheScreen();
    expect(screen.queryByText('250')).toBeNull();
  });
});

describe('interaction', () => {
  test('calls onPress when the row is tapped', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<ConversationItem item={direct()} onPress={onPress} />);

    await user.press(screen.getByText('Samuel'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('does not crash when tapped without a handler', async () => {
    const user = userEvent.setup();
    await render(<ConversationItem item={direct()} />);
    await user.press(screen.getByText('Samuel'));
    expect(screen.getByText('Samuel')).toBeOnTheScreen();
  });
});

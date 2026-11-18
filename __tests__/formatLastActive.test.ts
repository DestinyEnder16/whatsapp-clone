import { formatLastActive } from '../src/features/chat/utils/formatLastActive';

const NOW = new Date(2026, 10, 18, 12, 0, 0);
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});
afterEach(() => {
  jest.useRealTimers();
});

const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

describe('presence takes priority over last-active time', () => {
  test('typing wins over everything', () => {
    expect(
      formatLastActive({ isTyping: true, isOnline: true, lastActiveAt: ago(DAY) }),
    ).toBe('Typing...');
  });

  test('online wins over lastActiveAt', () => {
    expect(formatLastActive({ isOnline: true, lastActiveAt: ago(DAY) })).toBe(
      'Online',
    );
  });
});

describe('fallback', () => {
  test('defaults to "Offline" with no lastActiveAt', () => {
    expect(formatLastActive({})).toBe('Offline');
    expect(formatLastActive({ lastActiveAt: null })).toBe('Offline');
  });

  test('uses the provided fallback', () => {
    expect(formatLastActive({ fallback: 'Tap for info' })).toBe('Tap for info');
  });

  test('uses the fallback for an invalid date', () => {
    expect(
      formatLastActive({ lastActiveAt: 'nope', fallback: 'Unknown' }),
    ).toBe('Unknown');
  });
});

describe('relative last-active text', () => {
  test.each([
    ['30 seconds ago', 30 * 1000, 'Active just now'],
    ['1 minute ago', MIN, 'Active 1 minute ago'],
    ['59 minutes ago', 59 * MIN, 'Active 59 minutes ago'],
    ['60 minutes ago', 60 * MIN, 'Active 1 hour ago'],
    ['5 hours ago', 5 * HOUR, 'Active 5 hours ago'],
    ['23h59m ago', 24 * HOUR - MIN, 'Active 23 hours ago'],
    ['3 days ago', 3 * DAY, 'Active 3 days ago'],
    ['6 days ago', 6 * DAY, 'Active 6 days ago'],
  ])('%s', (_label, offset, expected) => {
    expect(formatLastActive({ lastActiveAt: ago(offset) })).toBe(expected);
  });

  test('a timestamp slightly in the future (clock skew) is "just now"', () => {
    expect(
      formatLastActive({ lastActiveAt: new Date(NOW.getTime() + 5000).toISOString() }),
    ).toBe('Active just now');
  });

  test('exactly 24 hours ago shows yesterday with a 24-hour time', () => {
    expect(
      formatLastActive({ lastActiveAt: new Date(2026, 10, 17, 12, 0).toISOString() }),
    ).toBe('Active yesterday at 12:00');
  });

  test('yesterday time is zero-padded', () => {
    jest.setSystemTime(new Date(2026, 10, 18, 12, 30));
    expect(
      formatLastActive({ lastActiveAt: new Date(2026, 10, 17, 8, 5).toISOString() }),
    ).toBe('Active yesterday at 08:05');
  });

  test('a week or more ago shows a DD/MM/YYYY last-seen date', () => {
    expect(
      formatLastActive({ lastActiveAt: new Date(2026, 10, 11, 9, 0).toISOString() }),
    ).toBe('Last seen 11/11/2026');
    expect(
      formatLastActive({ lastActiveAt: new Date(2025, 0, 5, 9, 0).toISOString() }),
    ).toBe('Last seen 05/01/2025');
  });
});

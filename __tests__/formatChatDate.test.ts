// Tests for formatChatDate and formatMessageTime (chat list and message times).
// Checks that a timestamp becomes the right label: a 12-hour time for today,
// "Yesterday", a short weekday for the past week, or a numeric date for older
// messages, plus the 24-hour HH:mm message time. Also checks that empty or
// invalid input is handled. The clock is fixed so results never change.

import {
  formatChatDate,
  formatMessageTime,
} from '../src/features/chat/utils/formatChatDate';

// Local-time "now": Wednesday 18 Nov 2026, 12:00. Dates below are built in
// local time too, so the tests do not depend on the machine's timezone.
const NOW = new Date(2026, 10, 18, 12, 0, 0);

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});
afterEach(() => {
  jest.useRealTimers();
});

const local = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m, d, h, min).toISOString();

describe('formatChatDate', () => {
  test.each([[undefined], [null], [''], ['not a date']])(
    'returns an empty string for %p',
    (input) => {
      expect(formatChatDate(input)).toBe('');
    },
  );

  test('shows a 12-hour time for a message from today', () => {
    expect(formatChatDate(local(2026, 10, 18, 9, 5))).toMatch(
      /^9:05\s?AM$/i,
    );
    expect(formatChatDate(local(2026, 10, 18, 23, 47))).toMatch(
      /^11:47\s?PM$/i,
    );
  });

  test('shows "Yesterday" for yesterday, even just after midnight', () => {
    expect(formatChatDate(local(2026, 10, 17, 23, 59))).toBe('Yesterday');
    expect(formatChatDate(local(2026, 10, 17, 0, 1))).toBe('Yesterday');
  });

  test('handles yesterday across a month boundary', () => {
    jest.setSystemTime(new Date(2026, 11, 1, 10, 0));
    expect(formatChatDate(local(2026, 10, 30, 18, 0))).toBe('Yesterday');
  });

  test('shows a short weekday for 2 to 6 days ago', () => {
    expect(formatChatDate(local(2026, 10, 16, 12, 0))).toMatch(/^[A-Za-z]{3,}/);
    expect(formatChatDate(local(2026, 10, 16, 12, 0))).not.toBe('Yesterday');
    expect(formatChatDate(local(2026, 10, 12, 12, 0))).toMatch(/^[A-Za-z]{3,}/);
  });

  test('shows a numeric date from 7 days ago onwards', () => {
    const result = formatChatDate(local(2026, 10, 11, 12, 0));
    expect(result).toMatch(/\d/);
    expect(result).toMatch(/26/);
    expect(result).not.toMatch(/AM|PM/i);
  });

  test('shows a numeric date with the year for old messages', () => {
    expect(formatChatDate(local(2024, 2, 5, 8, 0))).toMatch(/24/);
  });

  test('a message from the same day last year is not "today"', () => {
    expect(formatChatDate(local(2025, 10, 18, 12, 0))).not.toMatch(
      /AM|PM/i,
    );
  });
});

describe('formatMessageTime', () => {
  test('formats a timestamp as zero-padded 24-hour HH:mm', () => {
    expect(formatMessageTime(local(2026, 10, 18, 19, 40))).toBe('19:40');
    expect(formatMessageTime(local(2026, 10, 18, 7, 5))).toBe('07:05');
    expect(formatMessageTime(local(2026, 10, 18, 0, 0))).toBe('00:00');
  });

  test('uses the current time when no timestamp is given', () => {
    expect(formatMessageTime()).toBe('12:00');
    expect(formatMessageTime(null)).toBe('12:00');
  });

  test('returns an empty string for an invalid timestamp', () => {
    expect(formatMessageTime('garbage')).toBe('');
  });
});

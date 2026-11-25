// Tests for the phone-number helpers used when matching device contacts.
// Checks that numbers in many formats (local, with spaces, with 00 or +) are
// converted to E.164 (+2348012345678), that USSD codes, text and invalid
// numbers are rejected, that the signed-in user's country code is used for
// local numbers, and that lists are de-duplicated.

import {
  extractCountryCode,
  normalizePhoneNumber,
  normalizePhoneNumbers,
} from '@/features/contacts/utils/phoneUtils';

// phoneUtils reads the signed-in user's number to guess a country code.
// Replace the real auth store (network, push, secure storage) with a tiny one.
jest.mock('@/core/store/useAuthStore', () => {
  const { create } = require('zustand');
  return {
    useAuthStore: create(() => ({ user: { phoneNumber: '+2348012345678' } })),
  };
});

import { useAuthStore } from '@/core/store/useAuthStore';

const setUserPhone = (phoneNumber: string | null) =>
  (useAuthStore as any).setState({
    user: phoneNumber === null ? null : { phoneNumber },
  });

beforeEach(() => setUserPhone('+2348012345678'));

describe('extractCountryCode', () => {
  test.each([
    ['+2348012345678', '+234'],
    ['+14155552671', '+1'],
    ['+442071838750', '+44'],
    ['+6281234567890', '+62'],
  ])('%s -> %s', (input, expected) => {
    expect(extractCountryCode(input)).toBe(expected);
  });

  test.each([[undefined], [null], [''], ['2348012345678'], ['+999123456789']])(
    'returns null for %p',
    (input) => {
      expect(extractCountryCode(input)).toBeNull();
    },
  );
});

describe('normalizePhoneNumber', () => {
  test.each([
    ['local with trunk zero', '08012345678', '+2348012345678'],
    ['local with spaces', '0801 234 5678', '+2348012345678'],
    ['local without trunk zero', '8012345678', '+2348012345678'],
    ['punctuation', '(0801) 234-5678', '+2348012345678'],
    ['full number without +', '2348012345678', '+2348012345678'],
    ['00 prefix', '002348012345678', '+2348012345678'],
    ['already E.164', '+2348012345678', '+2348012345678'],
    ['other country E.164', '+14155552671', '+14155552671'],
  ])('%s', (_label, input, expected) => {
    expect(normalizePhoneNumber(input)).toBe(expected);
  });

  test.each([
    ['empty string', ''],
    ['USSD code', '*123#'],
    ['short code with #', '556#'],
    ['text name', 'MTN Care'],
    ['text mixed with a valid number', 'Call 08012345678'],
    ['USSD code containing a valid number', '*131*08012345678#'],
    ['only punctuation', '---'],
    ['too short', '+12345'],
    ['too long', '+12345678901234567'],
    ['Nigerian number with a bad leading digit', '+2346012345678'],
    ['Nigerian number that is too short', '+23480123'],
  ])('rejects %s', (_label, input) => {
    expect(normalizePhoneNumber(input)).toBeNull();
  });

  test('uses the signed-in user country code for local numbers', () => {
    setUserPhone('+14155552671');
    expect(normalizePhoneNumber('4155550100')).toBe('+14155550100');
  });

  test('an explicit fallback country code wins over the user country', () => {
    setUserPhone('+14155552671');
    expect(normalizePhoneNumber('08012345678', '+234')).toBe('+2348012345678');
  });

  test('defaults to Nigeria when nobody is signed in', () => {
    setUserPhone(null);
    expect(normalizePhoneNumber('08012345678')).toBe('+2348012345678');
  });
});

describe('normalizePhoneNumbers', () => {
  test('removes invalid numbers and duplicates, keeping first-seen order', () => {
    expect(
      normalizePhoneNumbers([
        '08012345678',
        '+2348012345678', // same number, other format
        '*123#',
        '09087654321',
        'MTN Care',
        '',
      ]),
    ).toEqual(['+2348012345678', '+2349087654321']);
  });

  test('returns an empty array for no input', () => {
    expect(normalizePhoneNumbers([])).toEqual([]);
  });
});

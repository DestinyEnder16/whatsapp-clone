import { canSendMessage } from '../src/canSendMessage';

test.each([
  ['', false],
  ['   ', false],
  ['\n\t', false],
  ['Hello', true],
  ['  Hello  ', true],
  ['👋', true],
])('canSendMessage(%j) returns %s', (input, expected) => {
  expect(canSendMessage(input)).toBe(expected);
});

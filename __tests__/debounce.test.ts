import { debounce } from '../src/debounce';

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

test('searches once with the latest input after the quiet period', () => {
  const search = jest.fn();
  const input = debounce(search, 300);
  input.run('Sa');
  jest.advanceTimersByTime(200);
  input.run('Samuel');
  jest.advanceTimersByTime(299);
  expect(search).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1);
  expect(search).toHaveBeenCalledTimes(1);
  expect(search).toHaveBeenCalledWith('Samuel');
});

test('does not search after cancellation', () => {
  const search = jest.fn();
  const input = debounce(search, 300);
  input.run('Samuel');
  input.cancel();
  jest.advanceTimersByTime(300);
  expect(search).not.toHaveBeenCalled();
});

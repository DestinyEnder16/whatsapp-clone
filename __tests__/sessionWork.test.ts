import { createSessionWork } from '../src/sessionWork';
import { deferred } from '../test-utils/deferred';

test('commits a result owned by the current session', async () => {
  const session = createSessionWork();
  const commit = jest.fn();
  const reject = jest.fn();
  await session.run(async () => 'A profile', commit, reject);
  expect(commit).toHaveBeenCalledWith('A profile');
  expect(reject).not.toHaveBeenCalled();
});

test('discards A success after the session changes to B', async () => {
  const session = createSessionWork();
  const request = deferred<string>();
  const commit = jest.fn();
  const reject = jest.fn();
  const work = session.run(() => request.promise, commit, reject);
  session.changeSession();
  request.resolve('A profile');
  await work;
  expect(commit).not.toHaveBeenCalled();
  expect(reject).not.toHaveBeenCalled();
});

test('discards A rejection after the session changes to B', async () => {
  const session = createSessionWork();
  const request = deferred<string>();
  const commit = jest.fn();
  const reject = jest.fn();
  const work = session.run(() => request.promise, commit, reject);
  session.changeSession();
  request.reject(new Error('A credentials rejected'));
  await work;
  expect(commit).not.toHaveBeenCalled();
  expect(reject).not.toHaveBeenCalled();
});

test('handles a rejection belonging to the current session', async () => {
  const session = createSessionWork();
  const error = new Error('Current credentials rejected');
  const commit = jest.fn();
  const reject = jest.fn();
  await session.run(async () => { throw error; }, commit, reject);
  expect(commit).not.toHaveBeenCalled();
  expect(reject).toHaveBeenCalledWith(error);
});

test('invalidates work even when the same account signs in again', async () => {
  const session = createSessionWork();
  const request = deferred<string>();
  const commit = jest.fn();
  const reject = jest.fn();
  const work = session.run(() => request.promise, commit, reject);
  session.changeSession(); // logout
  session.changeSession(); // new login, potentially the same account
  request.resolve('Old login profile');
  await work;
  expect(commit).not.toHaveBeenCalled();
});

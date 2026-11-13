import React from 'react';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { MessageComposer } from '../src/MessageComposer';
import { deferred } from '../test-utils/deferred';

test('disables Send for an empty draft', async () => {
  await render(<MessageComposer onSend={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
});

test('does not submit a draft containing only spaces', async () => {
  const onSend = jest.fn();
  const user = userEvent.setup();
  await render(<MessageComposer onSend={onSend} />);
  await user.type(screen.getByLabelText('Message'), '   ');
  await user.press(screen.getByRole('button', { name: 'Send' }));
  expect(onSend).not.toHaveBeenCalled();
});

test('submits trimmed text and clears the draft after success', async () => {
  const onSend = jest.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  await render(<MessageComposer onSend={onSend} />);
  await user.type(screen.getByLabelText('Message'), '  Hello  ');
  await user.press(screen.getByRole('button', { name: 'Send' }));
  expect(onSend).toHaveBeenCalledTimes(1);
  expect(onSend).toHaveBeenCalledWith('Hello');
  expect(await screen.findByText('Message sent')).toBeOnTheScreen();
  expect(screen.getByLabelText('Message')).toHaveDisplayValue('');
});

test('preserves the draft and shows an error after failure', async () => {
  const onSend = jest.fn().mockRejectedValue(new Error('Offline'));
  const user = userEvent.setup();
  await render(<MessageComposer onSend={onSend} />);
  await user.type(screen.getByLabelText('Message'), 'Keep this');
  await user.press(screen.getByRole('button', { name: 'Send' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not send message. Try again.',
  );
  expect(screen.getByLabelText('Message')).toHaveDisplayValue('Keep this');
  expect(screen.queryByText('Message sent')).toBeNull();
  expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
});

test('blocks another submission while the first is pending', async () => {
  const request = deferred<void>();
  const onSend = jest.fn(() => request.promise);
  const user = userEvent.setup();
  await render(<MessageComposer onSend={onSend} />);
  await user.type(screen.getByLabelText('Message'), 'Only once');
  await user.press(screen.getByRole('button', { name: 'Send' }));
  const button = screen.getByRole('button', { name: 'Sending' });
  expect(button).toBeDisabled();
  await user.type(screen.getByLabelText('Message'), ' extra');
  expect(screen.getByLabelText('Message')).toHaveDisplayValue('Only once');
  await user.press(button);
  expect(onSend).toHaveBeenCalledTimes(1);
  await act(async () => { request.resolve(undefined); });
  expect(await screen.findByText('Message sent')).toBeOnTheScreen();
});

test('allows another attempt with the preserved draft', async () => {
  const onSend = jest.fn()
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce(undefined);
  const user = userEvent.setup();
  await render(<MessageComposer onSend={onSend} />);
  await user.type(screen.getByLabelText('Message'), 'Try again');
  await user.press(screen.getByRole('button', { name: 'Send' }));
  await screen.findByRole('alert');
  await user.press(screen.getByRole('button', { name: 'Send' }));
  expect(onSend).toHaveBeenNthCalledWith(2, 'Try again');
  expect(await screen.findByText('Message sent')).toBeOnTheScreen();
  expect(screen.queryByRole('alert')).toBeNull();
});

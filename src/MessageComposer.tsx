import React, { useRef, useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { canSendMessage } from './canSendMessage';

type Props = { onSend: (message: string) => Promise<void> };

// A classroom example: one request at a time, with an editable draft after failure.
// Persistent retries, account ownership and real server delivery are separate lessons.
export function MessageComposer({ onSend }: Props) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const inFlight = useRef(false);

  async function submit() {
    if (inFlight.current || !canSendMessage(draft)) return;
    inFlight.current = true;
    setSending(true);
    setError(null);
    setSent(false);
    try {
      await onSend(draft.trim());
      setDraft('');
      setSent(true);
    } catch {
      setError('Could not send message. Try again.');
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <View>
      <TextInput
        accessibilityLabel="Message"
        value={draft}
        editable={!sending}
        onChangeText={(value) => {
          setDraft(value);
          setSent(false);
        }}
      />
      <Button
        title={sending ? 'Sending' : 'Send'}
        disabled={sending || !canSendMessage(draft)}
        onPress={() => { void submit(); }}
      />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      {sent ? <Text>Message sent</Text> : null}
    </View>
  );
}

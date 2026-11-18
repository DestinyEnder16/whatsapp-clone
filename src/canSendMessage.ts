export function canSendMessage(text: string): boolean {
  return text.trim().length > 0;
}

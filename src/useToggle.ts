import { useState } from 'react';

export function useToggle() {
  const [enabled, setEnabled] = useState(false);
  return { enabled, toggle: () => setEnabled((current) => !current) };
}

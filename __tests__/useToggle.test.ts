import { act, renderHook } from '@testing-library/react-native';
import { useToggle } from '../src/useToggle';

test('toggles its public value', async () => {
  const { result } = await renderHook(() => useToggle());
  expect(result.current.enabled).toBe(false);
  await act(async () => { result.current.toggle(); });
  expect(result.current.enabled).toBe(true);
});

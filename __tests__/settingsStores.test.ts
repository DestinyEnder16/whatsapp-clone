// Tests for the settings stores: PIN, privacy, data storage and theme.
// Checks their default values, that each setter changes only its own setting,
// that clearing the PIN resets both of its fields, and that only the intended
// fields (not runtime flags) are saved. Storage is replaced with an in-memory
// version.

import { useDataStorageStore } from '@/core/store/useDataStorageStore';
import { usePinStore } from '@/core/store/usePinStore';
import { usePrivacyStore } from '@/core/store/usePrivacyStore';
import { useThemeStore } from '@/core/store/useThemeStore';
import { clearPersisted, readPersisted } from '../test-utils/mmkvMock';

jest.mock('@/core/storage/mmkv', () => require('../test-utils/mmkvMock'));

beforeEach(() => {
  clearPersisted();
  usePinStore.setState({ pinCode: null, isPinCodeSet: false });
});

describe('usePinStore', () => {
  test('starts with no PIN', () => {
    expect(usePinStore.getState()).toMatchObject({
      pinCode: null,
      isPinCodeSet: false,
    });
  });

  test('setPinCode stores the PIN and marks it as set', () => {
    usePinStore.getState().setPinCode('1234');
    expect(usePinStore.getState()).toMatchObject({
      pinCode: '1234',
      isPinCodeSet: true,
    });
  });

  test('clearPinCode removes the PIN and the flag together', () => {
    usePinStore.getState().setPinCode('1234');
    usePinStore.getState().clearPinCode();
    expect(usePinStore.getState()).toMatchObject({
      pinCode: null,
      isPinCodeSet: false,
    });
  });

  test('the PIN is persisted', () => {
    usePinStore.getState().setPinCode('4321');
    expect(readPersisted('pin-code-storage').state).toMatchObject({
      pinCode: '4321',
      isPinCodeSet: true,
    });
  });
});

describe('usePrivacyStore', () => {
  test('has the documented defaults', () => {
    usePrivacyStore.setState(usePrivacyStore.getInitialState());
    expect(usePrivacyStore.getState()).toMatchObject({
      lastSeen: 'everyone',
      profilePhoto: 'contacts',
      about: 'contacts',
      group: 'everyone',
      faceIdEnabled: false,
    });
  });

  test('each setter changes only its own setting', () => {
    usePrivacyStore.setState(usePrivacyStore.getInitialState());
    usePrivacyStore.getState().setLastSeen('nobody');

    expect(usePrivacyStore.getState()).toMatchObject({
      lastSeen: 'nobody',
      profilePhoto: 'contacts',
      about: 'contacts',
      group: 'everyone',
      faceIdEnabled: false,
    });

    usePrivacyStore.getState().setFaceIdEnabled(true);
    expect(usePrivacyStore.getState().faceIdEnabled).toBe(true);
    expect(usePrivacyStore.getState().lastSeen).toBe('nobody');
  });
});

describe('useDataStorageStore', () => {
  test('has the documented auto-download defaults', () => {
    useDataStorageStore.setState(useDataStorageStore.getInitialState());
    expect(useDataStorageStore.getState()).toMatchObject({
      photos: 'off',
      audio: 'wifi',
      documents: 'cellular',
      videos: 'off',
      lastCacheClearedAt: null,
    });
  });

  test('clearCache records when the cache was cleared', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-18T12:00:00Z'));
    try {
      useDataStorageStore.getState().clearCache();
      expect(useDataStorageStore.getState().lastCacheClearedAt).toBe(
        new Date('2026-11-18T12:00:00Z').getTime()
      );
    } finally {
      jest.useRealTimers();
    }
  });

  test('setters update one media type at a time', () => {
    useDataStorageStore.setState(useDataStorageStore.getInitialState());
    useDataStorageStore.getState().setPhotos('cellular');
    expect(useDataStorageStore.getState()).toMatchObject({
      photos: 'cellular',
      videos: 'off',
    });
  });
});

describe('useThemeStore', () => {
  test('defaults to the system theme with the green accent', () => {
    useThemeStore.setState(useThemeStore.getInitialState());
    expect(useThemeStore.getState()).toMatchObject({
      mode: 'system',
      accentColor: 'green',
    });
  });

  test('setMode and setAccentColor update the selection', () => {
    useThemeStore.getState().setMode('dark');
    useThemeStore.getState().setAccentColor('blue');
    expect(useThemeStore.getState()).toMatchObject({
      mode: 'dark',
      accentColor: 'blue',
    });
  });

  test('only mode and accent are persisted, not the hydration flag', () => {
    useThemeStore.getState().setMode('light');
    useThemeStore.getState().setHasHydrated(true);

    const persisted = readPersisted('theme-storage').state;
    expect(persisted).toMatchObject({ mode: 'light' });
    expect(persisted).not.toHaveProperty('hasHydrated');
  });
});

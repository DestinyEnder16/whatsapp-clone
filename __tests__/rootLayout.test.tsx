// Tests for the root layout (src/app/_layout.tsx): protected rendering and
// return destinations.
// F9: private screens (tabs, chat, settings, pin-setup) must not mount before
// the saved sign-in has been restored, and never for a signed-out user. The
// splash screen stays up until fonts AND auth are ready. A signed-out or
// profile-incomplete user who opens a chat link keeps that exact chat (if its ID
// is a valid UUID) for after login/profile completion, which is then resumed
// once; malformed IDs are never remembered; and a signed-in user is not
// pushed to the chat twice (Expo Router already opens the link).
// Router, fonts, splash, links and notifications are mocked; the real layout,
// route guard, auth store and navigation store are used.
import { act, render, screen } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { router, useSegments } from 'expo-router';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useNavigationStore } from '@/core/store/useNavigationStore';
import { clearPersisted } from '../test-utils/mmkvMock';
import { signIn, signOut } from '../test-utils/authSession';

jest.mock('@/core/storage/mmkv', () => require('../test-utils/mmkvMock'));
jest.mock('@/services/notifications', () => ({
  ...require('../test-utils/authSession').notificationsMock(),
  configureNotificationHandler: jest.fn(),
  setupNotificationNavigation: jest.fn(() => jest.fn()),
  extractConversationId: jest.requireActual(
    '@/services/notifications/notificationNavigation',
  ).extractConversationId,
  isValidUuid: jest.requireActual('@/services/navigation/uuid').isValidUuid,
}));
jest.mock('@/services/api/authSession', () =>
  require('../test-utils/authSession').authSessionMock(),
);
jest.mock('../global.css', () => ({}));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-navigation-bar', () => ({
  NavigationBar: { setStyle: jest.fn() },
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-linking', () => ({
  // Enough of Linking.parse: "scheme://chat/<id>?x=1" -> { path, queryParams }.
  parse: (url: string) => {
    const [rest, query = ''] = url.replace(/^[a-z0-9+.-]+:\/\//i, '').split('?');
    return {
      path: rest.replace(/^\/+/, ''),
      queryParams: Object.fromEntries(new URLSearchParams(query)),
    };
  },
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ setColorScheme: jest.fn() }),
}));
jest.mock('react-native-toast-message', () => () => null);
jest.mock('expo-router', () => {
  const { View } = require('react-native');
  const Stack: any = ({ children }: any) => <View testID="stack">{children}</View>;
  Stack.Screen = ({ name }: any) => <View testID={`screen-${name}`} />;
  // A screen under a false guard is not mounted.
  Stack.Protected = ({ guard, children }: any) => (guard ? children : null);
  return {
    Stack,
    router: { push: jest.fn(), replace: jest.fn() },
    useSegments: jest.fn(() => []),
    usePathname: jest.fn(() => '/'),
  };
});

import RootLayout from '../src/app/_layout';

const CHAT_ID = '3f2b8c1e-7d44-4a1e-9b0a-1c2d3e4f5a6b';
const PROTECTED = ['tabs', 'chat', 'settings', 'pin-setup'].map((n) =>
  n === 'tabs' ? '(tabs)' : n,
);
const PUBLIC = ['index', 'onboarding', '(auth)'];

const segments = useSegments as jest.Mock;
const hideSplash = SplashScreen.hideAsync as jest.Mock;

const restoreAuth = (profileComplete = true, signedIn = true) =>
  act(() => {
    if (signedIn) {
      signIn('A');
      useAuthStore.setState({
        user: { id: 'A', profileComplete } as any,
        hasHydrated: true,
      });
    } else {
      signOut();
      useAuthStore.setState({ hasHydrated: true });
    }
  });

beforeEach(() => {
  clearPersisted();
  jest.clearAllMocks();
  segments.mockReturnValue([]);
  (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);
  signOut();
  useAuthStore.setState({ hasHydrated: false });
  useNavigationStore.setState({ pendingDestination: null });
});

describe('nothing private mounts before auth is restored', () => {
  test('renders nothing, and keeps the splash screen up, until saved auth is restored', async () => {
    await render(<RootLayout />);

    expect(screen.queryByTestId('stack')).toBeNull();
    expect(hideSplash).not.toHaveBeenCalled();
  });

  test('once auth is restored the app renders and the splash screen hides', async () => {
    await render(<RootLayout />);

    restoreAuth(true, false);

    expect(await screen.findByTestId('stack')).toBeOnTheScreen();
    expect(hideSplash).toHaveBeenCalled();
  });

  test('private screens are not mounted at the first render for a user who is signed in on disk', async () => {
    // Auth is signed in but not yet flagged as restored.
    act(() => {
      signIn('A');
      useAuthStore.setState({ hasHydrated: false });
    });
    await render(<RootLayout />);

    for (const name of PROTECTED) {
      expect(screen.queryByTestId(`screen-${name}`)).toBeNull();
    }
  });
});

describe('which screens exist', () => {
  test('a signed-out user gets the public screens only', async () => {
    restoreAuth(true, false);
    await render(<RootLayout />);

    for (const name of PUBLIC) {
      expect(screen.getByTestId(`screen-${name}`)).toBeOnTheScreen();
    }
    for (const name of PROTECTED) {
      expect(screen.queryByTestId(`screen-${name}`)).toBeNull();
    }
  });

  test('a signed-in user also gets the private screens, including pin-setup', async () => {
    restoreAuth(true, true);
    await render(<RootLayout />);

    for (const name of [...PUBLIC, ...PROTECTED]) {
      expect(screen.getByTestId(`screen-${name}`)).toBeOnTheScreen();
    }
  });

  test('a signed-in user whose profile is not finished gets the public screens only', async () => {
    restoreAuth(false, true);
    await render(<RootLayout />);

    for (const name of PUBLIC) {
      expect(screen.getByTestId(`screen-${name}`)).toBeOnTheScreen();
    }
    for (const name of PROTECTED) {
      expect(screen.queryByTestId(`screen-${name}`)).toBeNull();
    }
  });

  test('finishing the profile adds the private screens', async () => {
    restoreAuth(false, true);
    await render(<RootLayout />);
    expect(screen.queryByTestId('screen-chat')).toBeNull();

    act(() => {
      useAuthStore.setState({ user: { id: 'A', profileComplete: true } as any });
    });

    expect(screen.getByTestId('screen-chat')).toBeOnTheScreen();
  });

  test('signing out removes the private screens', async () => {
    restoreAuth(true, true);
    await render(<RootLayout />);
    expect(screen.getByTestId('screen-chat')).toBeOnTheScreen();

    restoreAuth(true, false);

    expect(screen.queryByTestId('screen-chat')).toBeNull();
  });
});

describe('redirects and the chat the user was trying to open', () => {
  test('signed out on a chat route: goes to onboarding and remembers that exact chat', async () => {
    segments.mockReturnValue(['chat', CHAT_ID]);
    restoreAuth(true, false);
    await render(<RootLayout />);

    expect(router.replace).toHaveBeenCalledWith('/onboarding');
    expect(useNavigationStore.getState().pendingDestination).toMatchObject({
      conversationId: CHAT_ID,
    });
  });

  test('signed out on a chat route with a malformed id: goes to onboarding, remembers nothing', async () => {
    segments.mockReturnValue(['chat', 'not-a-uuid']);
    restoreAuth(true, false);
    await render(<RootLayout />);

    expect(router.replace).toHaveBeenCalledWith('/onboarding');
    expect(useNavigationStore.getState().pendingDestination).toBeNull();
  });

  test('profile not finished: goes to finish it and keeps the chat for afterwards', async () => {
    segments.mockReturnValue(['chat', CHAT_ID]);
    restoreAuth(false, true);
    await render(<RootLayout />);

    expect(router.replace).toHaveBeenCalledWith('/profile');
    expect(useNavigationStore.getState().pendingDestination?.conversationId).toBe(CHAT_ID);
  });

  test('after login, leaving onboarding resumes the saved chat exactly once', async () => {
    useNavigationStore.getState().setPendingConversationId(CHAT_ID);
    segments.mockReturnValue(['onboarding']);
    restoreAuth(true, true);
    await render(<RootLayout />);

    expect(router.replace).toHaveBeenCalledWith(`/chat/${CHAT_ID}`);
    expect(useNavigationStore.getState().pendingDestination).toBeNull();
  });

  test('after login with nothing saved, goes to the tabs', async () => {
    segments.mockReturnValue(['(auth)']);
    restoreAuth(true, true);
    await render(<RootLayout />);

    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  test.each([['profile'], ['upload-photo'], ['verify-otp']])(
    'finishing the profile on (auth)/%s does not jump away or consume the saved chat',
    async (screenName) => {
      // The screen moves on by itself (e.g. to the optional photo step) and
      // consumes the saved chat when the flow is done.
      useNavigationStore.getState().setPendingConversationId(CHAT_ID);
      segments.mockReturnValue(['(auth)', screenName]);
      restoreAuth(true, true);
      await render(<RootLayout />);

      expect(router.replace).not.toHaveBeenCalled();
      expect(useNavigationStore.getState().pendingDestination?.conversationId).toBe(CHAT_ID);
    },
  );

  test('a signed-in user on a private screen is left alone', async () => {
    segments.mockReturnValue(['chat', CHAT_ID]);
    restoreAuth(true, true);
    await render(<RootLayout />);

    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  test('nothing is decided from the empty state before auth is restored', async () => {
    segments.mockReturnValue(['chat', CHAT_ID]);
    await render(<RootLayout />);

    expect(router.replace).not.toHaveBeenCalled();
    expect(useNavigationStore.getState().pendingDestination).toBeNull();
  });
});

describe('opening a chat link', () => {
  const openLink = async (url: string) => {
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(url);
    await render(<RootLayout />);
    await act(async () => {}); // let the initial-URL promise settle
  };

  test('signed out: the chat in the link is kept for after login', async () => {
    restoreAuth(true, false);
    await openLink(`whatsappclone://chat/${CHAT_ID}`);

    expect(useNavigationStore.getState().pendingDestination).toMatchObject({
      conversationId: CHAT_ID,
    });
  });

  test('profile not finished: the chat in the link is kept', async () => {
    restoreAuth(false, true);
    await openLink(`whatsappclone://chat/${CHAT_ID}`);

    expect(useNavigationStore.getState().pendingDestination?.conversationId).toBe(CHAT_ID);
  });

  test('signed in: not pushed a second time (the router already opens the link)', async () => {
    restoreAuth(true, true);
    await openLink(`whatsappclone://chat/${CHAT_ID}`);

    expect(router.push).not.toHaveBeenCalled();
    expect(useNavigationStore.getState().pendingDestination).toBeNull();
  });

  test.each([
    ['a malformed id', 'whatsappclone://chat/not-a-uuid'],
    ['a whitespace id', 'whatsappclone://chat/%20%20%20'],
    ['a different screen', `whatsappclone://settings/${CHAT_ID}`],
  ])('ignores %s', async (_label, url) => {
    restoreAuth(true, false);
    await openLink(url);

    expect(useNavigationStore.getState().pendingDestination).toBeNull();
  });
});

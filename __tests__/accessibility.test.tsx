// Tests for accessible names, roles and state on the shared and chat components.
// F10: the shared Button must keep its button role, a stable label, and
// disabled/busy state (a loading Button must not be an unlabeled spinner); the
// attachment and photo menus must be modal with labelled camera/gallery/dismiss
// controls; and a message must announce who sent it, when, its content and its
// status - with a failed message's Retry reachable by a screen reader (as a
// custom action on the bubble, because the bubble is one accessible element).
// These are component assertions only: they do NOT replace trying VoiceOver /
// TalkBack on a device (large text and focus recovery need a real device).
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { AnimatedMessageBubble } from '@/features/chat/components/AnimatedMessageBubble';
import { ChatAttachmentMenu } from '@/features/chat/components/ChatAttachmentMenu';
import Button from '@/shared/components/Button';
import { PhotoPickerModal } from '@/shared/components/PhotoPickerModal';
import { toast } from '@/shared/utils/toast';

jest.mock('@/core/storage/mmkv', () => require('../test-utils/mmkvMock'));
jest.mock('react-native-reanimated', () =>
  require('../test-utils/reanimatedMock'),
);
jest.mock('@/shared/utils/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('expo-media-library', () => {
  class Query {
    eq() { return this; }
    orderBy() { return this; }
    limit() { return this; }
    exe() { return Promise.resolve([]); }
  }
  return {
    Query,
    AssetField: { MEDIA_TYPE: 'mediaType', CREATION_TIME: 'creationTime' },
    MediaType: { IMAGE: 'image' },
    requestPermissionsAsync: jest.fn(() =>
      Promise.resolve({ granted: false, status: 'denied' }),
    ),
  };
});

const picker = ImagePicker as unknown as Record<string, jest.Mock>;
const PHOTO = {
  uri: 'file:///cache/p.jpg',
  mimeType: 'image/jpeg',
  fileName: 'p.jpg',
  fileSize: 1234,
};

describe('Button', () => {
  test('is a button named by its title', () => {
    render(<Button title="Save" onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeOnTheScreen();
  });

  test('can be enabled, and pressing it calls onPress', () => {
    const onPress = jest.fn();
    render(<Button title="Save" onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeEnabled();
    fireEvent.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('exposes disabled state and ignores presses when disabled', () => {
    const onPress = jest.fn();
    render(<Button title="Save" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button.props.accessibilityState).toMatchObject({ disabled: true, busy: false });
    fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });

  test('while loading it is still labelled (not an unlabeled spinner), busy and disabled', () => {
    const onPress = jest.fn();
    render(<Button title="Save" onPress={onPress} isLoading />);

    const button = screen.getByRole('button', { name: 'Save, in progress' });
    expect(button).toBeDisabled();
    expect(button.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  test('the loading spinner has its own label', () => {
    render(<Button title="Save" onPress={jest.fn()} isLoading />);
    expect(screen.getByLabelText('Loading')).toBeOnTheScreen();
  });

  test('uses a custom label and hint when given', () => {
    render(
      <Button
        title="Retry"
        onPress={jest.fn()}
        accessibilityLabel="Retry photo upload"
        accessibilityHint="Retries uploading your selected photo"
      />,
    );

    const button = screen.getByRole('button', { name: 'Retry photo upload' });
    expect(button.props.accessibilityHint).toBe('Retries uploading your selected photo');
  });
});

describe('AnimatedMessageBubble', () => {
  const bubble = (props: Record<string, unknown> = {}) =>
    render(
      <AnimatedMessageBubble id="m1" time="10:30" isMe text="See you soon" {...props} />,
    );

  test('announces sender, time, content and status as one element', () => {
    bubble({ isRead: true });
    expect(
      screen.getByLabelText('You, 10:30: See you soon. Read'),
    ).toBeOnTheScreen();
  });

  test.each([
    ['Sent', {}],
    ['Delivered', { isDelivered: true }],
    ['Read', { isRead: true }],
    ['Sending', { isPending: true }],
    ['Failed to send', { sendStatus: 'failed' }],
  ])('a sent message is announced as "%s"', (status, props) => {
    bubble(props);
    expect(
      screen.getByLabelText(`You, 10:30: See you soon. ${status}`),
    ).toBeOnTheScreen();
  });

  test("a contact's message names the contact and has no delivery status", () => {
    bubble({ isMe: false });
    expect(screen.getByLabelText('Contact, 10:30: See you soon. ')).toBeOnTheScreen();
  });

  test('a photo message with no text says it is a photo attachment', () => {
    bubble({ text: null, imageUri: 'https://cdn/p.jpg' });
    expect(
      screen.getByLabelText('You, 10:30: Photo attachment. Sent'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: 'Message image attachment' })).toBeOnTheScreen();
  });

  test('a failed message offers Retry as a screen-reader action on the bubble', () => {
    const onRetry = jest.fn();
    bubble({ sendStatus: 'failed', onRetry });

    const element = screen.getByLabelText('You, 10:30: See you soon. Failed to send');
    expect(element.props.accessibilityActions).toEqual([
      { name: 'retry', label: 'Retry sending message' },
    ]);

    fireEvent(element, 'accessibilityAction', { nativeEvent: { actionName: 'retry' } });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('the visible Retry control is a labelled button', () => {
    const onRetry = jest.fn();
    bubble({ sendStatus: 'failed', onRetry });

    const retry = screen.getByRole('button', {
      name: 'Failed to send message. Tap to retry.',
    });
    expect(retry.props.accessibilityHint).toBe('Retries sending this message');
    fireEvent.press(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('other actions do not trigger Retry', () => {
    const onRetry = jest.fn();
    bubble({ sendStatus: 'failed', onRetry });

    fireEvent(
      screen.getByLabelText('You, 10:30: See you soon. Failed to send'),
      'accessibilityAction',
      { nativeEvent: { actionName: 'activate' } },
    );

    expect(onRetry).not.toHaveBeenCalled();
  });

  test('a message that did not fail has no Retry action or button', () => {
    bubble({ onRetry: jest.fn() });

    expect(
      screen.getByLabelText('You, 10:30: See you soon. Sent').props.accessibilityActions,
    ).toBeUndefined();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('ChatAttachmentMenu', () => {
  beforeEach(() => {
    Object.values(picker).forEach((fn) => fn.mockReset?.());
    (toast.error as jest.Mock).mockClear();
    (toast.info as jest.Mock).mockClear();
  });

  const menu = (props: Record<string, unknown> = {}) =>
    render(
      <ChatAttachmentMenu visible onClose={jest.fn()} onSelectPhoto={jest.fn()} {...props} />,
    );

  test('is a modal dialog', () => {
    menu();
    expect(screen.UNSAFE_getByProps({ accessibilityViewIsModal: true })).toBeTruthy();
  });

  test('has labelled camera, gallery and dismiss controls', () => {
    menu();
    for (const name of [
      'Take photo with camera',
      'Choose photo from gallery',
      'Close attachment menu',
    ]) {
      expect(screen.getAllByRole('button', { name }).length).toBeGreaterThan(0);
    }
  });

  test('unavailable attachment types are announced as unavailable and disabled', () => {
    menu();
    const unavailable = screen.getAllByLabelText(/currently unavailable/);
    expect(unavailable.length).toBeGreaterThan(0);
    unavailable.forEach((item) =>
      expect(item.props.accessibilityState).toMatchObject({ disabled: true }),
    );
  });

  test('the dismiss control closes the menu', () => {
    const onClose = jest.fn();
    menu({ onClose });
    fireEvent.press(screen.getByLabelText('Close attachment menu'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('choosing a photo from the gallery passes it on and closes', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [PHOTO] });
    const onSelectPhoto = jest.fn();
    const onClose = jest.fn();
    menu({ onSelectPhoto, onClose });

    fireEvent.press(screen.getByLabelText('Choose photo from gallery'));

    await waitFor(() => expect(onSelectPhoto).toHaveBeenCalledWith(PHOTO));
    expect(onClose).toHaveBeenCalled();
  });

  test('cancelling the gallery picker selects nothing and tells the user', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });
    const onSelectPhoto = jest.fn();
    menu({ onSelectPhoto });

    fireEvent.press(screen.getByLabelText('Choose photo from gallery'));

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith('Cancelled', expect.any(String)));
    expect(onSelectPhoto).not.toHaveBeenCalled();
  });

  test('a denied photo-library permission explains why nothing opened', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });
    const onSelectPhoto = jest.fn();
    menu({ onSelectPhoto });

    fireEvent.press(screen.getByLabelText('Choose photo from gallery'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Permission Denied', expect.any(String)),
    );
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(onSelectPhoto).not.toHaveBeenCalled();
  });

  test('limited photo access is accepted', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: false,
      accessPrivileges: 'limited',
    });
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [PHOTO] });
    const onSelectPhoto = jest.fn();
    menu({ onSelectPhoto });

    fireEvent.press(screen.getByLabelText('Choose photo from gallery'));

    await waitFor(() => expect(onSelectPhoto).toHaveBeenCalledWith(PHOTO));
  });

  test('taking a photo passes it on and closes', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true });
    picker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [PHOTO] });
    const onSelectPhoto = jest.fn();
    const onClose = jest.fn();
    menu({ onSelectPhoto, onClose });

    fireEvent.press(screen.getByLabelText('Take photo with camera'));

    await waitFor(() => expect(onSelectPhoto).toHaveBeenCalledWith(PHOTO));
    expect(onClose).toHaveBeenCalled();
  });

  test('a denied camera permission explains why and opens no camera', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false });
    menu();

    fireEvent.press(screen.getByLabelText('Take photo with camera'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Permission Denied', expect.any(String)),
    );
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  test('cancelling the camera selects nothing', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true });
    picker.launchCameraAsync.mockResolvedValue({ canceled: true, assets: null });
    const onSelectPhoto = jest.fn();
    menu({ onSelectPhoto });

    fireEvent.press(screen.getByLabelText('Take photo with camera'));

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith('Cancelled', expect.any(String)));
    expect(onSelectPhoto).not.toHaveBeenCalled();
  });

  test('renders nothing while hidden', () => {
    menu({ visible: false });
    expect(screen.queryByLabelText('Close attachment menu')).toBeNull();
  });
});

describe('PhotoPickerModal', () => {
  beforeEach(() => {
    Object.values(picker).forEach((fn) => fn.mockReset?.());
    (toast.error as jest.Mock).mockClear();
    (toast.info as jest.Mock).mockClear();
  });

  const modal = (props: Record<string, unknown> = {}) =>
    render(
      <PhotoPickerModal visible onClose={jest.fn()} onSelectPhoto={jest.fn()} {...props} />,
    );

  test('is a modal with labelled camera, library, cancel and dismiss controls', async () => {
    modal();

    expect(screen.UNSAFE_getByProps({ accessibilityViewIsModal: true })).toBeTruthy();
    for (const name of [
      'Open camera to take photo',
      'Take Photo',
      'Choose From Library',
      'Cancel',
      'Close photo picker',
    ]) {
      expect(screen.getAllByRole('button', { name }).length).toBeGreaterThan(0);
    }
    await waitFor(() => expect(screen.queryByText('Take Photo')).toBeTruthy());
  });

  test('Cancel and the backdrop both dismiss without selecting', () => {
    const onClose = jest.fn();
    const onSelectPhoto = jest.fn();
    modal({ onClose, onSelectPhoto });

    fireEvent.press(screen.getByLabelText('Cancel'));
    fireEvent.press(screen.getByLabelText('Close photo picker'));

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onSelectPhoto).not.toHaveBeenCalled();
  });

  test('choosing from the library passes the photo on and closes', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [PHOTO] });
    const onSelectPhoto = jest.fn();
    const onClose = jest.fn();
    modal({ onSelectPhoto, onClose });

    fireEvent.press(screen.getByLabelText('Choose From Library'));

    await waitFor(() => expect(onSelectPhoto).toHaveBeenCalledWith(PHOTO));
    expect(onClose).toHaveBeenCalled();
  });

  test('a denied library permission is explained and nothing is selected', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });
    const onSelectPhoto = jest.fn();
    modal({ onSelectPhoto });

    fireEvent.press(screen.getByLabelText('Choose From Library'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Permission Denied', expect.any(String)),
    );
    expect(onSelectPhoto).not.toHaveBeenCalled();
  });

  test('a denied camera permission is explained and no camera opens', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false });
    modal();

    fireEvent.press(screen.getByLabelText('Take Photo'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Permission Denied', expect.any(String)),
    );
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  test('cancelling the picker or camera selects nothing', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true });
    picker.launchCameraAsync.mockResolvedValue({ canceled: true, assets: null });
    const onSelectPhoto = jest.fn();
    modal({ onSelectPhoto });

    fireEvent.press(screen.getByLabelText('Choose From Library'));
    await waitFor(() => expect(toast.info).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByLabelText('Take Photo'));
    await waitFor(() => expect(toast.info).toHaveBeenCalledTimes(2));

    expect(onSelectPhoto).not.toHaveBeenCalled();
  });
});

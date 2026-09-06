import Toast from 'react-native-toast-message';

export interface ToastOptions {
    title: string;
    message?: string;
    duration?: number;
}

export const toast = {
    success: (title: string, message?: string, duration?: number) => {
        Toast.show({
            type: 'success',
            text1: title,
            text2: message,
            visibilityTime: duration,
        });
    },

    error: (title: string, message?: string, duration?: number) => {
        Toast.show({
            type: 'error',
            text1: title,
            text2: message,
            visibilityTime: duration,
        });
    },

    info: (title: string, message?: string, duration?: number) => {
        Toast.show({
            type: 'info',
            text1: title,
            text2: message,
            visibilityTime: duration,
        });
    },

    hide: () => {
        Toast.hide();
    },
};

export default toast;

import { colors } from './colors';

export type ThemeMode = 'system' | 'light' | 'dark';

export type AccentColorKey = 'green' | 'blue' | 'red' | 'orange';

export interface AccentPalette {
  key: AccentColorKey;
  name: string;
  previewColor: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryText: string;
}

export interface BaseTheme {
  background: string;
  surface: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
  chatBg: string;
  chatBubbleReceived: string;
  chatBubbleReceivedText: string;
  tabBarBg: string;
  tabBarBorder: string;
  statusBar: 'dark' | 'light';
}

export const ACCENT_PALETTES: Record<AccentColorKey, AccentPalette> = {
  green: {
    key: 'green',
    name: 'Green',
    previewColor: colors.primary[400],
    primary: colors.primary[400],
    primaryDark: colors.primary[600],
    primaryLight: colors.primary[100],
    primaryText: '#FFFFFF',
  },
  blue: {
    key: 'blue',
    name: 'Blue',
    previewColor: colors.blue[400],
    primary: colors.blue[400],
    primaryDark: '#005AC2',
    primaryLight: colors.blue[50],
    primaryText: '#FFFFFF',
  },
  red: {
    key: 'red',
    name: 'Red',
    previewColor: colors.red[400],
    primary: colors.red[400],
    primaryDark: '#C73824',
    primaryLight: colors.red[50],
    primaryText: '#FFFFFF',
  },
  orange: {
    key: 'orange',
    name: 'Orange',
    previewColor: colors.orange[400],
    primary: colors.orange[400],
    primaryDark: '#E0921E',
    primaryLight: colors.orange[50],
    primaryText: '#FFFFFF',
  },
};

export const BASE_THEMES: Record<'light' | 'dark', BaseTheme> = {
  light: {
    background: '#FFFFFF',
    surface: '#F5F7F9',
    card: '#FFFFFF',
    cardBorder: colors.other.divider,
    text: colors.neutral[900],
    textSecondary: colors.neutral[300],
    textMuted: colors.neutral[200],
    border: colors.other.divider,
    divider: colors.other.divider,
    chatBg: '#F5F7F9',
    chatBubbleReceived: '#FFFFFF',
    chatBubbleReceivedText: colors.neutral[900],
    tabBarBg: '#FFFFFF',
    tabBarBorder: colors.other.divider,
    statusBar: 'dark',
  },
  dark: {
    background: '#081C2C',
    surface: '#0F2637',
    card: '#163043',
    cardBorder: '#1F3C51',
    text: '#F5F7F9',
    textSecondary: colors.neutral[100],
    textMuted: colors.neutral[200],
    border: '#1F3C51',
    divider: '#1F3C51',
    chatBg: '#05131E',
    chatBubbleReceived: '#163043',
    chatBubbleReceivedText: '#F5F7F9',
    tabBarBg: '#0F2637',
    tabBarBorder: '#1F3C51',
    statusBar: 'light',
  },
};

export interface AppThemeColors extends BaseTheme {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryText: string;
  chatBubbleSent: string;
  chatBubbleSentText: string;
}

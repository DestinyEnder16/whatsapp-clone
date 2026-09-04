// Chatme - UI Kit
// Re-exports palette from colors.js for full TypeScript type safety

const { colors: baseColors } = require('./colors.js');

export const colors = baseColors as {
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  neutral: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  other: {
    success: string;
    warning: string;
    danger: string;
    divider: string;
    bgLight: string;
    white: string;
    white90: string;
  };
  red: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
  };
  blue: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
  };
  orange: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
  };
};

export type Colors = typeof colors;

export default colors;

// Chatme - UI Kit
// Color palette extracted from the Figma "Global Styleguide" page
// Defined in JavaScript so both TypeScript and tailwind.config.js can consume it directly.

const colors = {
  primary: {
    50: '#F5FBF7',
    100: '#E8F5ED',
    200: '#ABDBBE',
    300: '#73C393',
    400: '#57B77D', // Primary
    500: '#499968',
    600: '#3A7A53',
    700: '#2B5C3F',
    800: '#1D3D2A',
    900: '#112519',
  },

  neutral: {
    50: '#DDE2E8',
    100: '#B3C2CE',
    200: '#8EA3B3',
    300: '#6E8597',
    400: '#4B667A',
    500: '#3A566A',
    600: '#1F3C51',
    700: '#163043',
    800: '#0F2637',
    900: '#081C2C',
  },

  // Semantic / utility colors
  other: {
    success: '#57B77D',
    warning: '#E8A13A',
    danger: '#DD524C',
    divider: '#EAEEF2',
    bgLight: '#F5F7F9',
    white: '#FFFFFF',
    white90: 'rgba(255, 255, 255, 0.9)',
  },

  red: {
    50: '#FFF5F5',
    100: '#F7C5BD',
    200: '#F4A79D',
    300: '#FA6B52',
    400: '#E8503A',
  },

  blue: {
    50: '#ECF5FF',
    100: '#AAD3FF',
    200: '#80BEFF',
    300: '#55A8FF',
    400: '#007CFF',
  },

  orange: {
    50: '#FFF0D9',
    100: '#FFE5BF',
    200: '#FFD99F',
    300: '#FFCC7F',
    400: '#FFB23F',
  },
};

module.exports = { colors };

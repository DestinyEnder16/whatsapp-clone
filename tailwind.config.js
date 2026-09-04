// tailwind.config.js
const { colors } = require("./src/shared/theme/colors.js");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        neutral: colors.neutral,
        other: colors.other,
        red: colors.red,
        blue: colors.blue,
        orange: colors.orange,
      },
    },
  },
  plugins: [],
};

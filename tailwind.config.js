// tailwind.config.js
const { colors } = require("./src/shared/theme/colors.js");
const plugin = require("tailwindcss/plugin");

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
      fontFamily: {
        sans: ["SFProDisplay-Regular"],
        regular: ["SFProDisplay-Regular"],
        medium: ["SFProDisplay-Medium"],
        bold: ["SFProDisplay-Bold"],
        semibold: ["SFProDisplay-Bold"],
        italic: ["SFProDisplay-SemiboldItalic"],
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".font-normal": {
          fontFamily: "SFProDisplay-Regular",
          fontWeight: "normal",
        },
        ".font-regular": {
          fontFamily: "SFProDisplay-Regular",
          fontWeight: "normal",
        },
        ".font-medium": {
          fontFamily: "SFProDisplay-Medium",
          fontWeight: "normal",
        },
        ".font-semibold": {
          fontFamily: "SFProDisplay-Bold",
          fontWeight: "normal",
        },
        ".font-bold": {
          fontFamily: "SFProDisplay-Bold",
          fontWeight: "normal",
        },
      });
    }),
  ],
};

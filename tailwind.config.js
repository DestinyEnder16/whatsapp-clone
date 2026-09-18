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
        sans: ["SFPRODISPLAYREGULAR", "SFProDisplay-Regular"],
        sfpro: ["SFPRODISPLAYREGULAR", "SFProDisplay-Regular"],
        sfprodisplay: ["SFPRODISPLAYREGULAR", "SFProDisplay-Regular"],
        regular: ["SFPRODISPLAYREGULAR", "SFProDisplay-Regular"],
        medium: ["SFPRODISPLAYMEDIUM", "SFProDisplay-Medium"],
        bold: ["SFPRODISPLAYBOLD", "SFProDisplay-Bold"],
        semibold: ["SFPRODISPLAYBOLD", "SFProDisplay-Bold"],
        italic: ["SFPRODISPLAYSEMIBOLDITALIC", "SFProDisplay-SemiboldItalic"],
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".font-normal": {
          fontFamily: "SFPRODISPLAYREGULAR",
          fontWeight: "normal",
        },
        ".font-regular": {
          fontFamily: "SFPRODISPLAYREGULAR",
          fontWeight: "normal",
        },
        ".font-medium": {
          fontFamily: "SFPRODISPLAYMEDIUM",
          fontWeight: "normal",
        },
        ".font-semibold": {
          fontFamily: "SFPRODISPLAYBOLD",
          fontWeight: "normal",
        },
        ".font-bold": {
          fontFamily: "SFPRODISPLAYBOLD",
          fontWeight: "normal",
        },
      });
    }),
  ],
};

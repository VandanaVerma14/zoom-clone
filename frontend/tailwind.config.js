/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        zoom: {
          blue: "#0B5CFF",
          tile: "#0E72ED",
          tileHover: "#0B62CC",
          orange: "#FF742E",
          orangeHover: "#F2621B",
          dark: "#1C1C1C",
          darker: "#121212",
          panel: "#242424",
          border: "#E7E7E9",
          text: "#232333",
          muted: "#747487",
          danger: "#E02828",
        },
      },
      fontFamily: {
        sans: ["Lato", "Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

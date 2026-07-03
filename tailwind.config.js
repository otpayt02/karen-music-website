/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "app-dark": "#121212",
        "sidebar-dark": "#1e1e1e",
        "paper-ivory": "#fffdf7",
        "karen-purple": "#bb86fc",
      },
      fontFamily: {
        ui: ["Instrument Sans", "Segoe UI", "sans-serif"],
        display: ["Fraunces", "Instrument Sans", "serif"],
        karen: ["Noto Sans Myanmar", "Myanmar Text", "sans-serif"],
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};

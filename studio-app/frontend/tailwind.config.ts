import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
        display: ["ui-serif", "Georgia", "serif"],
      },
      colors: {
        ink: "#0a0a0a",
        paper: "#ffffff",
        accent: "#1a1a1a",
      },
    },
  },
  plugins: [],
};

export default config;

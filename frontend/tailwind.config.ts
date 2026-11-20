import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef1f8",
          100: "#dfe4f0",
          200: "#c3cbe0",
          300: "#9aa8c6",
          400: "#6f80a8",
          500: "#4c5e8a",
          600: "#2f3f6e",
          700: "#263258",
          800: "#1e2a4a",
          900: "#17213c",
          950: "#0f172e",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};
export default config;

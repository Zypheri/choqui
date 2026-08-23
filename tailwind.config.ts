import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#EEF1F6",
          surface: "#FFFFFF",
        },
        sidebar: {
          bg: "#0E2C55",
          active: "#1F3B73",
        },
        border: {
          DEFAULT: "#E2E8F0",
        },
        text: {
          primary: "#12172B",
          muted: "#6B7280",
        },
        accent: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
        },
        fraud: {
          bajo: "#16A34A",
          medio: "#F59E0B",
          alto: "#DC2626",
        },
        critico: "#DC2626",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;

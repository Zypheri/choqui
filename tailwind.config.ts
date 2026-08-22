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
          base: "#0B0D12",
          surface: "#14161C",
          "surface-hover": "#1A1D24",
        },
        border: {
          DEFAULT: "#22252C",
        },
        text: {
          primary: "#F4F5F7",
          muted: "#9199A8",
        },
        accent: {
          DEFAULT: "#4C4FE0",
          hover: "#3D40C9",
        },
        fraud: {
          bajo: "#22C55E",
          medio: "#F5A524",
          alto: "#EF4444",
        },
        critico: "#EF4444",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;

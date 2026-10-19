import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#01636b",
          50: "#e6f4f5",
          100: "#cce9eb",
          200: "#99d3d7",
          300: "#66bdc3",
          400: "#33a7af",
          500: "#01636b",
          600: "#015056",
          700: "#013c40",
          800: "#01282b",
          900: "#0b1f24",
        },
        surface: {
          DEFAULT: "#f5f7fb",
          card: "#ffffff",
          sidebar: "#0b1f24",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 12px rgba(16, 24, 40, 0.04)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;

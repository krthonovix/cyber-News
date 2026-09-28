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
        cyber: {
          bg: "#090d16",
          card: "#0f172a",
          border: "#1e293b",
          accent: "#10b981",
          cyan: "#06b6d4",
        },
      },
    },
  },
  plugins: [],
};

export default config;

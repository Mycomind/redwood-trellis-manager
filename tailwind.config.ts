import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bark: "#3a2a22",
        barkSoft: "#5c4638",
        redwood: "#8f3f2b",
        redwoodDark: "#653124",
        clay: "#b66a45",
        linen: "#f5eee6",
        shop: "#efe0ce",
        moss: "#4f6f52",
        gold: "#c09545"
      },
      boxShadow: {
        soft: "0 8px 24px rgba(58, 42, 34, 0.12)"
      }
    },
  },
  plugins: [],
};

export default config;

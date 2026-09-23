import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 취합ON 기본 팔레트 — 추후 사내 브랜드 컬러로 교체 지점
        brand: {
          DEFAULT: "#1E2761",
          light: "#CADCFC",
        },
      },
    },
  },
  plugins: [],
};

export default config;

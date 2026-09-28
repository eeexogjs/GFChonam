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
        // 취합ON 팔레트 — 짙은 녹색 기반, 밝은 배경
        brand: {
          DEFAULT: "#166534", // primary deep green (버튼·포인트)
          light: "#E8F5EC", // tint bg
          soft: "#22A55B",
          cyan: "#4ADE80", // 밝은 그린 액센트 (다크 헤더 위 로고 등)
          ink: "#0C3B24", // 가장 짙은 녹색 (헤더·제목)
        },
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "Helvetica Neue",
          "Segoe UI",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "Malgun Gothic",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px rgba(13,27,58,0.06), 0 8px 24px rgba(13,27,58,0.06)",
        floatbar: "0 -4px 24px rgba(13,27,58,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;

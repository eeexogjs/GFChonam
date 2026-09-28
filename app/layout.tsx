import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "취합ON",
  description: "신청은 1분, 취합은 자동으로 — 사내 취합 플랫폼",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D1B3A",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-[#F6F7FB] font-sans text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}

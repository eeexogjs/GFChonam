import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "취합ON",
  description: "사내 취합 플랫폼 — 택배·세미나·잡설명회 신청을 한 곳에서",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // maximumScale 제한을 두지 않는다(접근성). iOS 자동확대는 globals.css의 16px 규칙으로 방지.
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}

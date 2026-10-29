import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "SOMSSI 2R Control Center", template: "%s | SOMSSI 2R" },
  description: "SOMSSI 2라운드 통합 운영 시스템 · V2 기준 정비 · 데이터 미연결",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

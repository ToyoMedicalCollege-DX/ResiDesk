import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { StaffDataProvider } from "@/lib/staff-data";

export const metadata: Metadata = {
  title: "ResiDesk（教員ダッシュボード）",
  description: "学生のResiApp利用状況を教員が見守るためのダッシュボード",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#E8895B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <StaffDataProvider>{children}</StaffDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

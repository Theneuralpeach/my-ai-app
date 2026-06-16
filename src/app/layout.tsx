import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "メモ & 日記 — 毎朝ブリーフィングに",
  description: "送ったメモ・日記を毎朝8時に翌日のブリーフィングへ自動でまとめる",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Identity Verification | GBG GO",
  description:
    "Secure identity and age verification powered by GBG GO Journey API v2.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">{children}</body>
    </html>
  );
}

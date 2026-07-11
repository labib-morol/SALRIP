import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Super Agent | Liquidity & Risk",
  description: "A safe, simulated multi-provider liquidity and risk intelligence prototype.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Public_Sans } from "next/font/google";
import "./globals.css";
import { AppQueryProvider } from "@/components/providers/QueryProvider";

const display = Fraunces({ variable: "--font-display", subsets: ["latin"], display: "swap" });
const body = Public_Sans({ variable: "--font-body", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

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
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body><AppQueryProvider>{children}</AppQueryProvider></body>
    </html>
  );
}

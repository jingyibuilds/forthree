import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import "./globals.css";
import "./study.css";

// The headings' serif. The product is English only (DECISIONS 2026-11-10), so
// this is a Latin face: it draws curly quotes at their proper width, which the
// CJK face it replaces did not.
const serif = Source_Serif_4({
  variable: "--font-serif-face",
  weight: ["500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CS Core — forthree",
  description: "A one-person CS Core semester.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

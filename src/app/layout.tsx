import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Common Ground — find a flat everyone can agree on", template: "%s · Common Ground" },
  description: "Three people. Three sets of preferences. One transparent shortlist.",
};

export const viewport: Viewport = { themeColor: "#f6f5f1" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="mx-auto w-full max-w-6xl px-4 py-10 text-sm text-faint sm:px-6">
          We don&apos;t choose your flat. We make the trade-offs clear so you can choose together.
        </footer>
      </body>
    </html>
  );
}

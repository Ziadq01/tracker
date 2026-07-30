import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { THEME_INIT_SCRIPT } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    default: "ADRIX — War Room",
    template: "%s · ADRIX",
  },
  description: "Performance tracking for affiliate media buyers.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={cn(
          GeistSans.variable,
          GeistMono.variable,
          "min-h-screen font-sans"
        )}
      >
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="min-w-0 flex-1 lg:pl-[12rem]">{children}</main>
        </div>
      </body>
    </html>
  );
}

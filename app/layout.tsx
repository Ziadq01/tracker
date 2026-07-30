import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    default: "ADRIX — War Room",
    template: "%s · ADRIX",
  },
  description: "Performance tracking for affiliate media buyers.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // ADRIX is dark-only — the class is hardcoded, there is no theme toggle.
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={cn(
          GeistSans.variable,
          GeistMono.variable,
          "min-h-screen bg-background font-sans text-foreground"
        )}
      >
        <TooltipProvider delayDuration={200}>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="min-w-0 flex-1 lg:pl-[13rem]">{children}</main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}

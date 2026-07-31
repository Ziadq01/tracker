import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { NavigationPendingProvider } from "@/components/motion/navigation-pending";
import { PageFade } from "@/components/motion/page-fade";
import { SidebarReveal } from "@/components/layout/sidebar-toggle";
import { SHELL_INIT_SCRIPT } from "@/components/layout/shell-init";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ADRIX — Analytics",
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
        {/* Applies the stored theme and sidebar state before first paint, so
            neither one flashes or shifts the layout on load. */}
        <script dangerouslySetInnerHTML={{ __html: SHELL_INIT_SCRIPT }} />
      </head>
      <body className={cn(inter.variable, "min-h-screen font-sans")}>
        <NavigationPendingProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="app-main min-w-0 flex-1">
              <SidebarReveal />
              <PageFade>{children}</PageFade>
            </main>
          </div>
        </NavigationPendingProvider>
      </body>
    </html>
  );
}

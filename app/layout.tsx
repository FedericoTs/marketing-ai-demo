"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { SettingsProvider } from "@/lib/contexts/settings-context";
import { Toaster } from "@/components/ui/sonner";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  // CRITICAL: Public and editor routes should be FULL-SCREEN (no sidebar)
  const isPublicRoute = pathname === "/" || pathname === "/auth/login" || pathname === "/auth/signup";
  const isEditorRoute = pathname?.startsWith("/dm-creative/editor") || pathname === "/templates";
  const isLandingPage = pathname?.startsWith("/lp/");
  const isFullScreen = isPublicRoute || isEditorRoute || isLandingPage;

  return (
    <html lang="en">
      <head>
        <title>DropLab - AI Marketing Platform</title>
        <meta name="description" content="Smart marketing automation powered by AI" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <SettingsProvider>
          {isFullScreen ? (
            // PUBLIC & STANDALONE PAGES - No sidebar, full screen
            <>
              {children}
              <Toaster />
            </>
          ) : (
            // APP PAGES - With sidebar
            <div className="flex h-screen">
              <Sidebar />
              <main className="flex-1 overflow-auto bg-white pt-16 lg:pt-0">
                {children}
              </main>
              <Toaster />
            </div>
          )}
        </SettingsProvider>
        <Analytics />
      </body>
    </html>
  );
}

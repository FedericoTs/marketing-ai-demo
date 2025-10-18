"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { SettingsProvider } from "@/lib/contexts/settings-context";
import { IndustryModuleProvider } from "@/lib/contexts/industry-module-context";
import { Toaster } from "@/components/ui/sonner";
import { usePathname } from "next/navigation";

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

  // CRITICAL: Editor routes should be FULL-SCREEN (no sidebar)
  const isEditorRoute = pathname?.startsWith("/dm-creative/editor");

  return (
    <html lang="en">
      <head>
        <title>AI Marketing Platform</title>
        <meta name="description" content="Demonstrate AI potential in marketing operations" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <SettingsProvider>
          <IndustryModuleProvider>
            {isEditorRoute ? (
              // STANDALONE EDITOR - No sidebar, full screen
              <>
                {children}
                <Toaster />
              </>
            ) : (
              // NORMAL APP - With sidebar
              <div className="flex h-screen">
                <Sidebar />
                <main className="flex-1 overflow-auto bg-white pt-16 lg:pt-0">
                  {children}
                </main>
                <Toaster />
              </div>
            )}
          </IndustryModuleProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}

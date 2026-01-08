import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { Sidebar } from "@/components/layout/sidebar";
import { VersionFooter } from "@/components/layout/version-footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Devatar - AI Avatar Video Studio",
  description: "Generate cinematic AI avatar videos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <SidebarProvider>
          <div className="flex h-screen bg-gray-950">
            {/* Sidebar */}
            <Sidebar />

            {/* Main content area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Scrollable content */}
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>

              {/* Footer */}
              <VersionFooter />
            </div>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}

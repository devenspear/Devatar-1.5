import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
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
        <div className="min-h-screen pb-12">
          {children}
        </div>
        <VersionFooter />
      </body>
    </html>
  );
}

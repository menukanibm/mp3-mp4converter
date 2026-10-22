import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import AuthModal from "@/components/AuthModal";

export const metadata: Metadata = {
  title: "StreamGrab - Video & MP3 Downloader",
  description: "Fast, reliable MP4 and MP3 downloader for YouTube, TikTok, and Facebook with secure authentication.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-200">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}

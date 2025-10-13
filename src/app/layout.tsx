import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from '../components/SessionProvider'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SortNote",
  description: "SortNote is a drag-and-drop task manager that syncs with Supabase.",
  // Resolve absolute URLs for open graph / twitter images
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : new URL("http://localhost:3000"),
  icons: {
    // Use the PNG already present in public/ (icon.png). Add cache-bust param.
    icon: [{ url: "/icon.png?v=2", type: "image/png", sizes: "any" }],
    shortcut: [{ url: "/icon.png?v=2", type: "image/png" }],
    apple: [{ url: "/icon.png?v=2", type: "image/png" }],
  },
  openGraph: {
    title: "SortNote",
    images: ["/icon.png?v=2"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

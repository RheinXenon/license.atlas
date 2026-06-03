import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { LangProvider } from "@/lib/i18n";
import { NavProgress } from "@/components/nav-progress";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches')){document.documentElement.classList.add('dark')}}catch(e){}})()`;

export const metadata: Metadata = {
  title: "LicenseAtlas — The Comprehensive License Collection",
  description:
    "Browse and explore 2,587+ software, AI model, data, and agent licenses. Including SPDX, OSI, Creative Commons, and more.",
  metadataBase: new URL("https://morningd.github.io/license.atlas"),
  openGraph: {
    title: "LicenseAtlas — The Comprehensive License Collection",
    description:
      "Browse and explore 2,587+ software, AI model, data, and agent licenses.",
    url: "https://morningd.github.io/license.atlas",
    siteName: "LicenseAtlas",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "LicenseAtlas",
    description:
      "Browse and explore 2,587+ software, AI model, data, and agent licenses.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <head />
        <body className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
          <Script id="theme-init" strategy="beforeInteractive">{themeScript}</Script>
          <NavProgress />
          <LangProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </LangProvider>
        </body>
      </html>
    </>
  );
}

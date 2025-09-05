import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SiteBid AI - AI-Powered Construction Estimating",
    template: "%s | SiteBid AI"
  },
  description: "Professional construction estimating software for excavation contractors. Generate accurate bids for driveways, culverts, ponds, basements, trench work, and septic systems with AI-powered calculations.",
  keywords: [
    "construction estimating",
    "excavation bidding",
    "driveway estimate",
    "culvert installation",
    "pond construction",
    "basement excavation",
    "septic system",
    "trench work",
    "construction calculator",
    "contractor software"
  ],
  authors: [{ name: "SiteBid AI" }],
  creator: "SiteBid AI",
  publisher: "SiteBid AI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://sitebid-ai.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sitebid-ai.com",
    title: "SiteBid AI - AI-Powered Construction Estimating",
    description: "Professional construction estimating software for excavation contractors. Generate accurate bids with AI-powered calculations.",
    siteName: "SiteBid AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "SiteBid AI - AI-Powered Construction Estimating",
    description: "Professional construction estimating software for excavation contractors.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your verification codes here when available
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-br from-slate-50 to-blue-50`}
      >
        <div id="root" className="relative">
          {children}
        </div>
      </body>
    </html>
  );
}

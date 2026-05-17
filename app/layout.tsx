import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import { SplashScreen } from "@/components/rinwa/SplashScreen";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const serif = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RÌNWÁ Hospitality & Experiences",
    template: "%s | RÌNWÁ Hospitality & Experiences",
  },
  description:
    "RÌNWÁ Hospitality & Experiences curates culture-first hospitality, brand experiences, and storytelling-led gatherings for modern audiences.",
  applicationName: "RÌNWÁ Hospitality & Experiences",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  keywords: [
    "RÌNWÁ",
    "hospitality",
    "experiences",
    "event curation",
    "luxury hospitality",
    "culture-driven experiences",
    "Lagos events",
  ],
  authors: [{ name: "RÌNWÁ Hospitality & Experiences" }],
  creator: "RÌNWÁ Hospitality & Experiences",
  publisher: "RÌNWÁ Hospitality & Experiences",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "RÌNWÁ Hospitality & Experiences",
    title: "RÌNWÁ Hospitality & Experiences",
    description:
      "A culture-first hospitality and experiences brand curating intentional moments for hospitality-led brands, creative founders, and tourism ecosystems.",
    images: [
      {
        url: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "RÌNWÁ Hospitality & Experiences editorial hero image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RÌNWÁ Hospitality & Experiences",
    description:
      "Culture-first hospitality, brand experiences, and storytelling-led gatherings.",
    images: [
      "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1600&q=80",
    ],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  other: {
    "theme-color": "#0f766e",
    "color-scheme": "dark",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}

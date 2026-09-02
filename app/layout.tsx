import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import { SplashScreen } from "@/components/rinwa/SplashScreen";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

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
    default: "RÌNWÁ | The Bridge Between Coming Home & Building Home",
    template: "%s | RÌNWÁ | The Bridge Between Coming Home & Building Home",
  },
  description:
    "RÌNWÁ Hospitality & Experiences specialises in strategic brand positioning, cultural matchmaking, and media relations for high-net-worth individuals. We curate high-profile experiences rooted in African hospitality across Lagos, Africa, and Canada.",
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
    "strategic brand positioning",
    "cultural matchmaking",
    "media relations",
    "high-profile experiences",
    "high net worth individuals",
    "African hospitality",
    "tourism in Lagos",
    "Africa",
    "Canada",
    "luxury events Africa",
    "Lagos tourism",
  ],
  authors: [{ name: "RÌNWÁ Hospitality & Experiences" }],
  creator: "RÌNWÁ Hospitality & Experiences",
  publisher: "RÌNWÁ Hospitality & Experiences",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "RÌNWÁ Hospitality & Experiences",
    title: "RÌNWÁ | The Bridge Between Coming Home & Building Home",
    description:
      "RÌNWÁ is your bridge between coming home and building at home",
    images: [
      {
        url: "https://res.cloudinary.com/matthew-ayinde/image/upload/v1780477515/rinwa-green_iu1he9.png",
        width: 1600,
        height: 900,
        alt: "RÌNWÁ Hospitality & Experiences editorial hero image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RÌNWÁ | The Bridge Between Coming Home & Building Home",
    description:
      "RÌNWÁ is your bridge between coming home and building at home",
    images: [
      "https://res.cloudinary.com/matthew-ayinde/image/upload/v1780477515/rinwa-green_iu1he9.png",
    ],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
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

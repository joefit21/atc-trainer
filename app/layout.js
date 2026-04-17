import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://practice.flight-levels.com"),
  title: {
    default: "ICAO Radio Lab — Aviation English & ATC Radio Practice for Pilots",
    template: "%s | ICAO Radio Lab",
  },
  description:
    "Practice ATC radio calls, IFR clearances, and readbacks with real-time AI scoring. Built by a CFI and former air traffic controller. Used by pilots in India, the UAE, and beyond.",
  keywords: [
    "ICAO radio lab",
    "aviation English practice",
    "ICAO language proficiency",
    "ATC radio practice",
    "pilot radio communication",
    "IFR clearance practice",
    "ATC readback",
    "IFR clearance readback",
    "ground control practice",
    "aviation radio training",
    "CRAFT clearance",
    "pilot ATC practice",
    "air traffic control training",
    "pilot radio English",
    "VFR flight following practice",
    "Class D radio practice",
    "DGCA pilot English",
    "ICAO level 4 English",
  ],
  authors: [{ name: "Joe Mattison" }],
  creator: "Joe Mattison",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ICAO Radio Lab — Aviation English & ATC Radio Practice for Pilots",
    description:
      "Practice ATC radio calls, IFR clearances, and readbacks with real-time AI scoring. Built by a CFI and former air traffic controller.",
    url: "https://practice.flight-levels.com",
    siteName: "ICAO Radio Lab — Flight Levels",
    type: "website",
    locale: "en_US",
    images: [{ url: "/Practice_OG.jpg", width: 1200, height: 630, alt: "ICAO Radio Lab — Aviation English Practice for Pilots" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ICAO Radio Lab — Aviation English & ATC Radio Practice for Pilots",
    description:
      "Practice ATC radio calls, IFR clearances, and readbacks with real-time AI scoring. Built by a CFI and former air traffic controller.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  verification: {
    google: 'B-otcnzmCLOIA1-bVLp8fQCBbVQDnkv09Gnna4stXAs',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=AW-17833668075"
          strategy="afterInteractive"
        />
        <Script id="google-ads" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17833668075');
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

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
    default: "ATC Clearance Trainer — Practice ATC Calls & Clearances for Pilots",
    template: "%s | ATC Clearance Trainer",
  },
  description:
    "Practice ATC radio calls, IFR clearances, and readbacks with real-time AI scoring. Built by a CFI and former air traffic controller. Perfect for student pilots, IFR students, and international pilots training in the US.",
  keywords: [
    "ATC radio practice",
    "student pilot radio practice",
    "how to talk to ATC",
    "talking to ATC practice",
    "pilot radio communication",
    "IFR clearance practice",
    "IFR clearance readback",
    "ATC readback practice",
    "ground control practice",
    "aviation radio training",
    "CRAFT clearance",
    "student pilot ATC",
    "air traffic control training",
    "Class D radio practice",
    "VFR flight following practice",
    "ICAO radio lab",
    "ATC radio communication practice",
    "pilot radio anxiety",
  ],
  authors: [{ name: "Joe Mattison" }],
  creator: "Joe Mattison",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ATC Clearance Trainer — Practice ATC Radio Calls for Pilots",
    description:
      "Practice ATC radio calls, IFR clearances, and readbacks with real-time AI scoring. Built by a CFI and former air traffic controller.",
    url: "https://practice.flight-levels.com",
    siteName: "ATC Clearance Trainer — Flight Levels",
    type: "website",
    locale: "en_US",
    images: [{ url: "/Practice_OG.jpg", width: 1200, height: 630, alt: "ATC Clearance Trainer — Practice ATC Radio Calls for Pilots" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ATC Clearance Trainer — Practice ATC Radio Calls for Pilots",
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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
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
            gtag('config', 'G-X5H170S5BR');
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

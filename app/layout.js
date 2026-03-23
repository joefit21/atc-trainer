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
    default: "ATC Trainer — Practice IFR Clearances & Readbacks",
    template: "%s | ATC Trainer",
  },
  description:
    "Master ATC clearances before you fly. Practice IFR clearance readbacks and ground control with real-time AI scoring. Built by a former air traffic controller and CFI.",
  keywords: [
    "ATC trainer",
    "IFR clearance practice",
    "ATC readback",
    "pilot radio communication",
    "IFR clearance readback",
    "ground control practice",
    "aviation radio training",
    "CRAFT clearance",
    "pilot ATC practice",
    "air traffic control training",
  ],
  authors: [{ name: "Joe Mattison" }],
  creator: "Joe Mattison",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ATC Trainer — Practice IFR Clearances & Readbacks",
    description:
      "Master ATC clearances before you fly. Practice IFR clearance readbacks with real-time AI scoring. Built by a former air traffic controller and CFI.",
    url: "https://practice.flight-levels.com",
    siteName: "ATC Trainer",
    type: "website",
    locale: "en_US",
    images: [{ url: "/Practice_OG.jpg", width: 1200, height: 630, alt: "ATC Trainer — Practice IFR Clearances Before You Fly" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ATC Trainer — Practice IFR Clearances & Readbacks",
    description:
      "Master ATC clearances before you fly. Practice IFR clearance readbacks with real-time AI scoring. Built by a former air traffic controller.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
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

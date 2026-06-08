import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "LeadFlow — Quality Freelance Leads, Delivered Daily",
  description: "Stop chasing clients. We find, vet and deliver high-quality freelance leads to your inbox every day.",
  openGraph: {
    title: "LeadFlow — Quality Freelance Leads, Delivered Daily",
    description: "We find UK freelance leads that match your skills. 3-5 targeted leads per day. No job board scrolling.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} ${instrumentSerif.variable} h-full antialiased`}>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-lg focus:text-sm focus:font-semibold focus:text-white focus:bg-[#1B6B4A] focus:shadow-lg">
          Skip to content
        </a>
        <Navbar />
        <main id="main-content" className="flex-1" role="main">
          {children}
        </main>
        <Toaster position="bottom-right" toastOptions={{ className: 'toast-default' }} />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "LeadFlow — Quality Freelance Leads, Delivered Daily",
  description: "Stop hunting for clients. LeadFlow finds, vets and scores freelance leads for you — delivered fresh every 6 hours.",
  openGraph: {
    title: "LeadFlow — Quality Freelance Leads, Delivered Daily",
    description: "We find UK freelance leads that match your skills. 3-5 targeted leads per day.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-lg focus:text-sm focus:font-semibold focus:text-white focus:bg-[#166B42] focus:shadow-lg">
          Skip to content
        </a>
        <main id="main-content" className="flex-1" role="main">
          {children}
        </main>
        <Toaster position="top-right" toastOptions={{ className: 'toast-default', duration: 3500 }} />
      </body>
    </html>
  );
}

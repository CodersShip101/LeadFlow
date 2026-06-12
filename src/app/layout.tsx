import type { Metadata } from "next";
import { Inter, Playfair_Display, DM_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "900"],
});

const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "LeadFlow — Stop chasing leads. Start choosing them.",
  description: "Quality freelance leads, scored by AI, delivered every 6 hours. Stop hunting, start choosing.",
  openGraph: {
    title: "LeadFlow — Stop chasing leads. Start choosing them.",
    description: "We find UK freelance leads that match your skills and rate. Scored, filtered, delivered every 6 hours.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${dmMono.variable} h-full antialiased`}>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-lg focus:text-sm focus:font-semibold focus:text-[#0D0F14] focus:bg-[#F5A623] focus:shadow-lg">
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

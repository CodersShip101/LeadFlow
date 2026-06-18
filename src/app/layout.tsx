import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Flaiir — AI-Scored Freelance Leads, Delivered as Often as Every Hour",
  description: "Flaiir finds and scores freelance leads from Reddit, Reed and We Work Remotely, then delivers the best matches to your inbox as often as every hour. Start free with a 7-day Pro trial — cancel any time.",
  openGraph: {
    title: "Flaiir — AI-Scored Freelance Leads, as Often as Every Hour",
    description: "We find and score freelance leads matched to your skills, then deliver the best ones as often as every hour. Start free.",
    type: "website",
    siteName: "Flaiir",
    locale: "en_GB",
  },
  robots: "index, follow, max-image-preview:large",
  keywords: "freelance leads, freelance work UK, lead generation freelancers, AI lead scoring, freelance client acquisition, remote freelance jobs",
};

export const viewport: Viewport = {
  themeColor: "#0B1220",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-lg focus:text-sm focus:font-semibold focus:text-[#070b13] focus:bg-[#C4F000] focus:shadow-lg">
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

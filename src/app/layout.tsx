import type { Metadata } from "next";
import {
  Instrument_Serif,
  IBM_Plex_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const jakartaSans = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CIBERNEWS — Security Intelligence Wire & Forum",
  description:
    "Minimalist bilingual cybersecurity intelligence dispatch, CVE monitor, and analyst forum.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${ibmPlexMono.variable} ${jakartaSans.variable}`}
    >
      <body className="min-h-screen antialiased selection:bg-[#FF3B1D] selection:text-white">
        {children}
      </body>
    </html>
  );
}

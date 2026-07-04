import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans, Noto_Serif, Noto_Sans_Arabic } from "next/font/google";
import Navbar from "@/components/Navbar";
import { AudioProvider } from "@/context/AudioContext";
import MediaPlayer from "@/components/MediaPlayer";
import { Providers } from "@/components/Providers";
import LanguageSelectionModal from "@/components/LanguageSelectionModal";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import DownloadModalHost from "@/components/offline/DownloadModalHost";
import "./globals.css";
import chaptersTiny from "../../public/data/chapters-tiny.json";
import juzsData from "../../public/data/juzs.json";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Quran Library",
  description: "Browse and read the Quran",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Quran Library",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#005354",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${plusJakarta.variable} ${notoSerif.variable} ${notoArabic.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preload" href="/fonts/common/surah-name-v2.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/common/quran-common.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Urdu/Al Qalam Taj Nastaleeq Regular - [UrduFonts.com].ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <meta name="color-scheme" content="light only" />
      </head>
      <body className="min-h-full flex flex-col bg-white text-black" suppressHydrationWarning>
        <Providers>
          <AudioProvider>
            <Navbar chapters={chaptersTiny} juzs={juzsData.juzs} />
            <LanguageSelectionModal />
            <OnboardingTutorial />
            {children}
            <MediaPlayer />
            <DownloadModalHost />
          </AudioProvider>
        </Providers>
      </body>
    </html>
  );
}


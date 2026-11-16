import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import AccentClientShell from "@/components/AccentClientShell";
import OptionalClerkProvider from "@/components/OptionalClerkProvider";
import WatercolorDefs from "@/art/WatercolorDefs";
import { OG_IMAGES, SITE_URL } from "@/lib/metadata";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "asterisk (*) — Say it once. Let it travel.",
    template: "%s",
  },
  description:
    "Write one honest thought. asterisk tunes it for Threads, X, Facebook, Substack, Instagram and TikTok, checks the weather, and sends it on its way.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "asterisk (*) — Say it once. Let it travel.",
    description: "One thought, every room it belongs in.",
    siteName: "asterisk (*)",
    locale: "en_US",
    type: "website",
    images: [{ url: OG_IMAGES.home, width: 1200, height: 630, type: "image/png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "asterisk (*) — Say it once. Let it travel.",
    description: "One thought, every room it belongs in.",
    images: [OG_IMAGES.home],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${newsreader.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <OptionalClerkProvider>
          <WatercolorDefs />
          <AccentClientShell>{children}</AccentClientShell>
        </OptionalClerkProvider>
      </body>
    </html>
  );
}

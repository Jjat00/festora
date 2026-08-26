import type { Metadata } from "next";
import { headers } from "next/headers";
import { Urbanist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPCION =
  "Entrega las fotos de tu cliente en una galería privada con PIN, favoritas y descarga de todos los originales.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · Galerías privadas para fotógrafos`,
    template: "%s",
  },
  description: DESCRIPCION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "es_CO",
    url: SITE_URL,
    title: `${SITE_NAME} · Galerías privadas para fotógrafos`,
    description: DESCRIPCION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · Galerías privadas para fotógrafos`,
    description: DESCRIPCION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

/** El idioma sale del pathname, que el proxy deja en `x-pathname`. */
async function currentLocale(): Promise<Locale> {
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const segment = pathname.split("/")[1];
  return locales.includes(segment as Locale)
    ? (segment as Locale)
    : defaultLocale;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await currentLocale();

  return (
    <html lang={lang}>
      <body
        className={`${urbanist.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

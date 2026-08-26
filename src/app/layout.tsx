import type { Metadata } from "next";
import { Urbanist, Geist_Mono } from "next/font/google";
import "./globals.css";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://festora.studio";
const DESCRIPCION =
  "Comparte tus fotos con tus clientes de forma profesional y elegante.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Festora",
  description: DESCRIPCION,
  openGraph: {
    type: "website",
    siteName: "Festora",
    locale: "es_CO",
    url: APP_URL,
    title: "Festora",
    description: DESCRIPCION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Festora",
    description: DESCRIPCION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${urbanist.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

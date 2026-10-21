import { Great_Vibes, Cormorant_Garamond } from "next/font/google";

// Solo se descargan donde se usan (galerías con tema): sin preload, el navegador
// pide el archivo de la fuente únicamente si algún texto la aplica.
export const greatVibes = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-script",
  display: "swap",
  preload: false, // las galerías clásicas importan el módulo pero no deben descargar estas fuentes
});

export const cormorant = Cormorant_Garamond({
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif-theme",
  display: "swap",
  preload: false, // las galerías clásicas importan el módulo pero no deben descargar estas fuentes
});

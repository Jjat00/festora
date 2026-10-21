import { Great_Vibes, Cormorant_Garamond } from "next/font/google";

// Solo las cargan las galerías con tema; el sitio y el dashboard no las piden.
export const greatVibes = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-script",
  display: "swap",
});

export const cormorant = Cormorant_Garamond({
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif-theme",
  display: "swap",
});

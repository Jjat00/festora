/**
 * Idiomas del sitio publico de Festora.
 *
 * El espanol vive en la raiz (`/`, `/precios`, ...) porque son las URL que ya
 * estaban indexadas y compartidas; el ingles cuelga de `/en`. La app en si
 * (dashboard y galerias `/g/[slug]`) no se traduce: no es contenido publico.
 */
export const locales = ["es", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

/** Idioma que Google sirve a quien no habla ninguno de los dos. */
export const xDefaultLocale: Locale = "en";

/** Paginas publicas que existen en los dos idiomas. */
export type PageKey = "home" | "howItWorks" | "pricing" | "faq";

export const routes: Record<PageKey, Record<Locale, string>> = {
  home: { es: "/", en: "/en" },
  howItWorks: { es: "/como-funciona", en: "/en/how-it-works" },
  pricing: { es: "/precios", en: "/en/pricing" },
  faq: { es: "/preguntas-frecuentes", en: "/en/faq" },
};

/** La politica de privacidad existe solo en espanol por ahora. */
export const privacyPath = "/privacidad";

export const ogLocale: Record<Locale, string> = {
  es: "es_CO",
  en: "en_US",
};

export function pathFor(page: PageKey, locale: Locale): string {
  return routes[page][locale];
}

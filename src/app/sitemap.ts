import type { MetadataRoute } from "next";
import {
  locales,
  privacyPath,
  routes,
  xDefaultLocale,
  type PageKey,
} from "@/lib/i18n/config";
import { absoluteUrl } from "@/lib/seo";

/**
 * Fecha de la ultima revision del contenido publico. Se actualiza a mano al
 * cambiar los textos: un `lastModified` que se mueve en cada peticion no dice
 * nada y los buscadores dejan de creerselo.
 */
const CONTENT_UPDATED = new Date("2026-08-26");

const PRIORITY: Record<PageKey, number> = {
  home: 1,
  howItWorks: 0.8,
  pricing: 0.8,
  faq: 0.7,
};

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = (Object.keys(routes) as PageKey[]).flatMap((page) =>
    locales.map((locale) => ({
      url: absoluteUrl(routes[page][locale]),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "monthly" as const,
      priority: PRIORITY[page],
      alternates: {
        languages: Object.fromEntries([
          ...locales.map((l) => [l, absoluteUrl(routes[page][l])]),
          ["x-default", absoluteUrl(routes[page][xDefaultLocale])],
        ]),
      },
    })),
  );

  return [
    ...pages,
    {
      url: absoluteUrl(privacyPath),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  ];
}

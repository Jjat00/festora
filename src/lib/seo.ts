import type { Metadata } from "next";
import {
  type Locale,
  type PageKey,
  locales,
  ogLocale,
  routes,
  xDefaultLocale,
} from "@/lib/i18n/config";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://festora.studio"
).replace(/\/$/, "");

export const SITE_NAME = "Festora";

/** Host canonico. Cualquier otro (los *.vercel.app) se marca noindex en el proxy. */
export const CANONICAL_HOST = new URL(SITE_URL).host;

export function absoluteUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

type MetadataInput = {
  page: PageKey;
  locale: Locale;
  title: string;
  description: string;
};

/**
 * Construye la metadata de una pagina publica: canonical absoluto al dominio
 * propio, hreflang hacia la version del otro idioma y Open Graph coherente.
 */
export function buildMetadata({
  page,
  locale,
  title,
  description,
}: MetadataInput): Metadata {
  const canonical = absoluteUrl(routes[page][locale]);

  const languages = Object.fromEntries([
    ...locales.map((l) => [l, absoluteUrl(routes[page][l])]),
    ["x-default", absoluteUrl(routes[page][xDefaultLocale])],
  ]) as Record<string, string>;

  return {
    title,
    description,
    alternates: { canonical, languages },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: ogLocale[locale],
      url: canonical,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/* ------------------------------------------------------------------ */
/* JSON-LD                                                             */
/* ------------------------------------------------------------------ */

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;
const APP_ID = `${SITE_URL}/#software`;

export function organizationSchema() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/icon.png"),
      width: 512,
      height: 512,
    },
    description:
      "Festora is photo delivery software for professional photographers: private client galleries with PIN, client favourites, bulk download and AI photo search.",
    foundingDate: "2026",
    areaServed: "Worldwide",
    knowsLanguage: ["es", "en"],
  };
}

export function webSiteSchema(locale: Locale) {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: locale,
    publisher: { "@id": ORG_ID },
  };
}

type SoftwareInput = {
  locale: Locale;
  description: string;
  featureList: string[];
  freePlanName: string;
};

/**
 * Solo se declara la oferta que existe de verdad: la cuenta gratuita con 5 GB.
 * No hay aggregateRating porque no hay resenas reales que respalden un numero.
 */
export function softwareApplicationSchema({
  locale,
  description,
  featureList,
  freePlanName,
}: SoftwareInput) {
  return {
    "@type": "SoftwareApplication",
    "@id": APP_ID,
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "MultimediaApplication",
    applicationSubCategory: "Photo gallery software",
    operatingSystem: "Web browser",
    inLanguage: locale,
    description,
    featureList,
    softwareHelp: absoluteUrl(routes.howItWorks[locale]),
    publisher: { "@id": ORG_ID },
    offers: {
      "@type": "Offer",
      name: freePlanName,
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: absoluteUrl(routes.pricing[locale]),
    },
  };
}

export type FaqItem = { question: string; answer: string };

export function faqPageSchema(items: FaqItem[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export type HowToStep = { name: string; text: string };

export function howToSchema(
  name: string,
  description: string,
  steps: HowToStep[],
) {
  return {
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function breadcrumbSchema(
  crumbs: Array<{ name: string; path: string }>,
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/** Envuelve varios esquemas en un unico bloque `@graph`. */
export function graph(...nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}

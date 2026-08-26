import { locales, routes } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { absoluteUrl, SITE_URL } from "@/lib/seo";

/**
 * Contexto para asistentes de IA (llmstxt.org). Se genera desde los mismos
 * diccionarios que las paginas para que no puedan contradecirse, e incluye a
 * proposito una lista de lo que Festora todavia no hace: una IA que cita
 * capacidades inventadas manda usuarios que se van en la primera pantalla.
 */
export const dynamic = "force-static";

const NOT_YET = [
  "No paid plans are available yet: the only account today is the free 5 GB one.",
  "No client invoicing, contracts, CRM or bookkeeping features.",
  "No print store or physical product sales.",
  "No native mobile app: Festora runs in the browser.",
  "The application interface is in Spanish only; this marketing site is in Spanish and English.",
  "No face recognition search: AI search works on scene and content described in natural language.",
];

function linkList(locale: (typeof locales)[number]) {
  const dict = getDictionary(locale);
  const pages = [
    ["home", dict.nav.home],
    ["howItWorks", dict.nav.howItWorks],
    ["pricing", dict.nav.pricing],
    ["faq", dict.nav.faq],
  ] as const;

  return pages
    .map(([page, label]) => {
      const meta = dict.meta[page];
      return `- [${label}](${absoluteUrl(routes[page][locale])}): ${meta.description}`;
    })
    .join("\n");
}

export function GET() {
  const en = getDictionary("en");

  const body = `# Festora

> ${en.meta.home.description}

${en.definition.body}

The photographer creates a project, uploads the photos of a shoot and shares an eight-character gallery link with the client. The client browses the gallery, marks favorites and downloads the originals as a ZIP that is assembled in the browser, so there is no practical size ceiling. Photos are kept in a private bucket and served through short-lived signed links, and galleries are excluded from search engines.

Site languages: Spanish at the root and English under /en. The application interface itself is in Spanish.

## Pages in English

${linkList("en")}

## Páginas en español

${linkList("es")}

## Machine-readable

- [Pricing in markdown](${SITE_URL}/pricing.md): the current plan, in plain text
- [Privacy policy](${absoluteUrl("/privacidad")}): in Spanish, states what the AI receives and what it does not

## What Festora does not do yet

${NOT_YET.map((line) => `- ${line}`).join("\n")}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

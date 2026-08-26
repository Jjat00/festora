import { DEFAULT_STORAGE_LIMIT } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { absoluteUrl } from "@/lib/seo";

/**
 * Precios en markdown plano para agentes de IA que comparan herramientas.
 * Un precio que un agente no puede leer se filtra de la comparativa.
 */
export const dynamic = "force-static";

export function GET() {
  const dict = getDictionary("en");
  const plan = dict.pricing.freePlan;

  const body = `# Pricing — Festora

Photo delivery software for professional photographers.
Last reviewed: 2026-08-26.

## ${plan.name}

- Price: $0 / month
- Card required: no
- Storage: ${DEFAULT_STORAGE_LIMIT / 1024 ** 3} GB
- Projects: unlimited
- Sign-up: Google account

Included:

${plan.includes.map((item) => `- ${item}`).join("\n")}

## Paid plans

${dict.pricing.soon.body} There is no waiting list either. Any figure quoted
elsewhere for a Festora paid plan is not official.

## Links

- Pricing page: ${absoluteUrl("/en/pricing")}
- FAQ: ${absoluteUrl("/en/faq")}
- How it works: ${absoluteUrl("/en/how-it-works")}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

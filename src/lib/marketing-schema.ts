import type { Locale } from "@/lib/i18n/config";
import { routes } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  breadcrumbSchema,
  faqPageSchema,
  graph,
  howToSchema,
  organizationSchema,
  softwareApplicationSchema,
  webSiteSchema,
} from "@/lib/seo";

function appSchema(dict: Dictionary, locale: Locale) {
  return softwareApplicationSchema({
    locale,
    description: dict.definition.body,
    featureList: dict.features.items.map((item) => item.title),
    freePlanName: dict.pricing.freePlan.name,
  });
}

export function homeSchema(dict: Dictionary, locale: Locale) {
  return graph(
    organizationSchema(),
    webSiteSchema(locale),
    appSchema(dict, locale),
  );
}

export function howItWorksSchema(dict: Dictionary, locale: Locale) {
  return graph(
    organizationSchema(),
    howToSchema(
      dict.steps.heading,
      dict.steps.intro,
      dict.steps.items.map((step) => ({ name: step.title, text: step.body })),
    ),
    breadcrumbSchema([
      { name: "Festora", path: routes.home[locale] },
      { name: dict.nav.howItWorks, path: routes.howItWorks[locale] },
    ]),
  );
}

export function pricingSchema(dict: Dictionary, locale: Locale) {
  return graph(
    organizationSchema(),
    appSchema(dict, locale),
    breadcrumbSchema([
      { name: "Festora", path: routes.home[locale] },
      { name: dict.nav.pricing, path: routes.pricing[locale] },
    ]),
  );
}

export function faqSchema(dict: Dictionary, locale: Locale) {
  return graph(
    organizationSchema(),
    faqPageSchema(dict.faq.items.map((item) => ({ ...item }))),
    breadcrumbSchema([
      { name: "Festora", path: routes.home[locale] },
      { name: dict.nav.faq, path: routes.faq[locale] },
    ]),
  );
}

import type { Metadata } from "next";
import { auth } from "@/auth";
import { JsonLd } from "@/components/json-ld";
import { PricingContent } from "@/components/marketing/pricing-content";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pricingSchema } from "@/lib/marketing-schema";
import { buildMetadata } from "@/lib/seo";

const LOCALE = "en" as const;
const dict = getDictionary(LOCALE);

export const metadata: Metadata = buildMetadata({
  page: "pricing",
  locale: LOCALE,
  title: dict.meta.pricing.title,
  description: dict.meta.pricing.description,
});

export default async function Page() {
  const session = await auth();

  return (
    <>
      <JsonLd data={pricingSchema(dict, LOCALE)} />
      <PricingContent dict={dict} locale={LOCALE} signedIn={Boolean(session?.user)} />
    </>
  );
}

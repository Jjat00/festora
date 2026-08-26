import type { Metadata } from "next";
import { auth } from "@/auth";
import { JsonLd } from "@/components/json-ld";
import { FaqContent } from "@/components/marketing/faq-content";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { faqSchema } from "@/lib/marketing-schema";
import { buildMetadata } from "@/lib/seo";

const LOCALE = "en" as const;
const dict = getDictionary(LOCALE);

export const metadata: Metadata = buildMetadata({
  page: "faq",
  locale: LOCALE,
  title: dict.meta.faq.title,
  description: dict.meta.faq.description,
});

export default async function Page() {
  const session = await auth();

  return (
    <>
      <JsonLd data={faqSchema(dict, LOCALE)} />
      <FaqContent dict={dict} locale={LOCALE} signedIn={Boolean(session?.user)} />
    </>
  );
}

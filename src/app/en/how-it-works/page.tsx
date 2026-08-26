import type { Metadata } from "next";
import { auth } from "@/auth";
import { JsonLd } from "@/components/json-ld";
import { HowItWorksContent } from "@/components/marketing/how-it-works-content";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { howItWorksSchema } from "@/lib/marketing-schema";
import { buildMetadata } from "@/lib/seo";

const LOCALE = "en" as const;
const dict = getDictionary(LOCALE);

export const metadata: Metadata = buildMetadata({
  page: "howItWorks",
  locale: LOCALE,
  title: dict.meta.howItWorks.title,
  description: dict.meta.howItWorks.description,
});

export default async function Page() {
  const session = await auth();

  return (
    <>
      <JsonLd data={howItWorksSchema(dict, LOCALE)} />
      <HowItWorksContent dict={dict} locale={LOCALE} signedIn={Boolean(session?.user)} />
    </>
  );
}

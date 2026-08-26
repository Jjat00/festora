import type { Metadata } from "next";
import { auth } from "@/auth";
import { JsonLd } from "@/components/json-ld";
import { Landing } from "@/components/marketing/landing";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { homeSchema } from "@/lib/marketing-schema";
import { buildMetadata } from "@/lib/seo";

const LOCALE = "en" as const;
const dict = getDictionary(LOCALE);

export const metadata: Metadata = buildMetadata({
  page: "home",
  locale: LOCALE,
  title: dict.meta.home.title,
  description: dict.meta.home.description,
});

export default async function Page() {
  const session = await auth();

  return (
    <>
      <JsonLd data={homeSchema(dict, LOCALE)} />
      <Landing dict={dict} locale={LOCALE} signedIn={Boolean(session?.user)} />
    </>
  );
}

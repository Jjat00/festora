import Link from "next/link";
import { PageShell } from "@/components/marketing/page-shell";
import type { Locale } from "@/lib/i18n/config";
import { pathFor } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function FaqContent({
  dict,
  locale,
  signedIn,
}: {
  dict: Dictionary;
  locale: Locale;
  signedIn: boolean;
}) {
  return (
    <PageShell
      dict={dict}
      locale={locale}
      page="faq"
      signedIn={signedIn}
      eyebrow={dict.faq.eyebrow}
      title={dict.faq.heading}
      intro={dict.faq.intro}
    >
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10">
        <dl className="flex flex-col gap-10">
          {dict.faq.items.map((item) => (
            <div key={item.question}>
              <dt className="text-lg font-medium tracking-tight">
                {item.question}
              </dt>
              <dd className="mt-3 text-base font-light leading-relaxed text-muted-foreground">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-16 flex flex-wrap gap-6 border-t border-border/50 pt-8">
          <Link
            href={pathFor("howItWorks", locale)}
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            {dict.nav.howItWorks}
          </Link>
          <Link
            href={pathFor("pricing", locale)}
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            {dict.nav.pricing}
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

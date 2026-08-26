import Link from "next/link";
import { SignInButton } from "@/components/sign-in-button";
import { PageShell } from "@/components/marketing/page-shell";
import type { Locale } from "@/lib/i18n/config";
import { pathFor } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-0.5 shrink-0 text-emerald-500"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function PricingContent({
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
      page="pricing"
      signedIn={signedIn}
      eyebrow={dict.pricing.eyebrow}
      title={dict.pricing.heading}
      intro={dict.pricing.intro}
    >
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10">
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-border bg-muted/20 p-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {dict.pricing.freePlan.name}
            </h2>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-light tracking-tight">
                ${dict.pricing.freePlan.price}
              </span>
              <span className="text-sm font-light text-muted-foreground">
                {dict.pricing.freePlan.priceNote}
              </span>
            </p>

            <ul className="mt-8 flex flex-col gap-3">
              {dict.pricing.freePlan.includes.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-sm font-light leading-relaxed text-muted-foreground"
                >
                  <Check />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              {signedIn ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 items-center rounded-full bg-foreground px-7 text-sm font-medium text-background transition-opacity hover:opacity-80"
                >
                  {dict.nav.goToDashboard}
                </Link>
              ) : (
                <SignInButton
                  className="inline-flex h-11 items-center rounded-full bg-foreground px-7 text-sm font-medium text-background transition-opacity hover:opacity-80"
                  label={dict.pricing.freePlan.cta}
                />
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-dashed border-border/70 p-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {dict.pricing.soon.name}
            </h2>
            <p className="mt-6 text-sm font-light leading-relaxed text-muted-foreground">
              {dict.pricing.soon.body}
            </p>
          </section>
        </div>

        <div className="mt-14 border-t border-border/50 pt-8">
          <Link
            href={pathFor("faq", locale)}
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            {dict.pricing.faqLink}
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

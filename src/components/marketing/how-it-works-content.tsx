import Link from "next/link";
import { SignInButton } from "@/components/sign-in-button";
import { PageShell } from "@/components/marketing/page-shell";
import type { Locale } from "@/lib/i18n/config";
import { pathFor } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function HowItWorksContent({
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
      page="howItWorks"
      signedIn={signedIn}
      eyebrow={dict.steps.eyebrow}
      title={dict.steps.heading}
      intro={dict.steps.intro}
    >
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10">
        <ol className="flex flex-col gap-10">
          {dict.steps.items.map((step, index) => (
            <li key={step.title} className="flex gap-5">
              <span
                aria-hidden="true"
                className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border font-mono text-xs text-muted-foreground"
              >
                {index + 1}
              </span>
              <div>
                <h2 className="text-lg font-medium tracking-tight">
                  {step.title}
                </h2>
                <p className="mt-2 text-base font-light leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-12 border-t border-border/50 pt-8 text-base font-light leading-relaxed text-muted-foreground">
          {dict.steps.closing}
        </p>

        <section className="mt-16">
          <h2 className="text-2xl font-medium tracking-tight">
            {dict.privacyBlock.heading}
          </h2>
          <p className="mt-3 text-base font-light leading-relaxed text-muted-foreground">
            {dict.privacyBlock.body}
          </p>
        </section>

        <div className="mt-14 flex flex-wrap items-center gap-4 border-t border-border/50 pt-8">
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
              label={dict.hero.ctaPrimary}
            />
          )}
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

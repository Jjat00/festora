import Image from "next/image";
import Link from "next/link";
import { CinematicHero } from "@/components/cinematic-hero";
import { SignInButton } from "@/components/sign-in-button";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";
import type { Locale } from "@/lib/i18n/config";
import { pathFor, privacyPath } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const featureIcons = [
  <>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>,
  <>
    <path d="M12 21s-6.716-4.246-9.032-8.13C1.36 10.14 2.35 6.5 5.5 5.5 7.53 4.86 9.5 5.5 12 8c2.5-2.5 4.47-3.14 6.5-2.5 3.15 1 4.14 4.64 2.532 7.37C18.716 16.754 12 21 12 21Z" />
  </>,
  <>
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M12 12v9" />
    <path d="m8 17 4 4 4-4" />
  </>,
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
    <path d="M11 8v6" />
    <path d="M8 11h6" />
  </>,
  <>
    <path d="M2 12h5" />
    <path d="M17 12h5" />
    <path d="M12 2v5" />
    <path d="M12 17v5" />
    <circle cx="12" cy="12" r="4" />
    <path d="m4.93 4.93 2.83 2.83" />
    <path d="m16.24 16.24 2.83 2.83" />
    <path d="m4.93 19.07 2.83-2.83" />
    <path d="m16.24 7.76 2.83-2.83" />
  </>,
  <>
    <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5Z" />
    <path d="M8.5 2.5A6.5 6.5 0 0 0 2 12c0 3.5 2.5 6.5 6 7.5" />
    <path d="M15.5 2.5A6.5 6.5 0 0 1 22 12c0 3.5-2.5 6.5-6 7.5" />
    <path d="M12 17v5" />
  </>,
];

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-foreground"
    >
      {children}
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

export function Landing({
  dict,
  locale,
  signedIn,
}: {
  dict: Dictionary;
  locale: Locale;
  signedIn: boolean;
}) {
  return (
    <div className="relative flex flex-col bg-background text-foreground">
      <CinematicHero>
        <SiteNav
          dict={dict}
          locale={locale}
          page="home"
          signedIn={signedIn}
          transparent
        />

        <main
          id="contenido"
          className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16"
        >
          <div className="flex flex-col items-center">
            <Image
              src="/assets/nombre.png"
              alt="Festora"
              width={600}
              height={250}
              className="w-[290px] md:w-[380px] lg:w-[500px] h-auto invert dark:invert-0 opacity-95 drop-shadow-2xl"
              priority
            />

            <h1 className="mt-7 max-w-2xl text-center text-2xl font-light tracking-tight drop-shadow-md sm:text-3xl lg:text-4xl">
              {dict.hero.h1}
            </h1>

            <p className="mt-4 max-w-xl text-center text-base font-light leading-relaxed text-foreground/80 drop-shadow-md sm:text-lg">
              {dict.hero.subtitle}
            </p>

            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
              {signedIn ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-8 text-sm font-medium text-background shadow-xl transition-opacity hover:opacity-90"
                >
                  {dict.nav.goToDashboard}
                  <ArrowRight />
                </Link>
              ) : (
                <SignInButton
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-8 text-sm font-medium text-background shadow-xl transition-opacity hover:opacity-90"
                  label={dict.hero.ctaPrimary}
                />
              )}
              <Link
                href={pathFor("howItWorks", locale)}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-foreground/25 px-7 text-sm font-medium text-foreground/85 backdrop-blur-sm transition-colors hover:border-foreground/50 hover:text-foreground"
              >
                {dict.hero.ctaSecondary}
              </Link>
            </div>

            <p className="mt-5 text-xs font-light text-foreground/60 drop-shadow-md">
              {dict.hero.freeNote}
            </p>
          </div>
        </main>

        <div className="relative z-10 flex justify-center pb-8">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="animate-bounce text-foreground/50"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </CinematicHero>

      {/* Bloque de definicion: respuesta directa para buscadores y asistentes */}
      <section className="relative z-10 border-t border-border/50 bg-background">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
            {dict.definition.heading}
          </h2>
          <p className="mt-4 text-base font-light leading-relaxed text-muted-foreground">
            {dict.definition.body}
          </p>
        </div>
      </section>

      <section className="relative z-10 border-t border-border/50 bg-background">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:px-10 sm:py-28">
          <div className="flex flex-col items-center text-center">
            <h2 className="max-w-2xl text-3xl font-medium tracking-tight sm:text-4xl">
              {dict.features.heading}
            </h2>
            <p className="mt-4 max-w-lg text-base font-light leading-relaxed text-muted-foreground">
              {dict.features.subheading}
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dict.features.items.map((item, index) => (
              <article
                key={item.title}
                className="rounded-2xl border border-border/60 bg-muted/20 p-6 transition-colors hover:border-border hover:bg-muted/40"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
                  <Icon>{featureIcons[index % featureIcons.length]}</Icon>
                </div>
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-border/50 bg-background">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:px-10 sm:py-28">
          <div className="flex flex-col items-center text-center">
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {dict.steps.eyebrow}
            </span>
            <h2 className="mt-4 max-w-2xl text-3xl font-medium tracking-tight sm:text-4xl">
              {dict.steps.heading}
            </h2>
            <p className="mt-4 max-w-lg text-base font-light leading-relaxed text-muted-foreground">
              {dict.steps.intro}
            </p>
          </div>

          <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dict.steps.items.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-border/60 bg-muted/20 p-6"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex justify-center">
            <Link
              href={pathFor("howItWorks", locale)}
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              {dict.hero.ctaSecondary}
              <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-border/50 bg-background">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
            {dict.privacyBlock.heading}
          </h2>
          <p className="mt-4 text-base font-light leading-relaxed text-muted-foreground">
            {dict.privacyBlock.body}
          </p>
          <p className="mt-4 text-sm font-light leading-relaxed text-muted-foreground">
            {dict.privacyBlock.aiNote}
          </p>
          <Link
            href={privacyPath}
            hrefLang="es"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            {dict.privacyBlock.linkLabel}
            <ArrowRight />
          </Link>
        </div>
      </section>

      <section className="relative z-10 border-t border-border/50 bg-background">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center sm:px-10">
          <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
            {dict.finalCta.heading}
          </h2>
          <p className="mt-4 max-w-lg text-base font-light leading-relaxed text-muted-foreground">
            {dict.finalCta.body}
          </p>
          <div className="mt-8">
            {signedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-7 text-sm font-medium text-background transition-opacity hover:opacity-80"
              >
                {dict.nav.goToDashboard}
                <ArrowRight />
              </Link>
            ) : (
              <SignInButton
                className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-7 text-sm font-medium text-background transition-opacity hover:opacity-80"
                label={dict.finalCta.cta}
              />
            )}
          </div>
        </div>
      </section>

      <SiteFooter dict={dict} locale={locale} />
    </div>
  );
}

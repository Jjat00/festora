import Image from "next/image";
import Link from "next/link";
import { SignInButton } from "@/components/sign-in-button";
import type { Locale, PageKey } from "@/lib/i18n/config";
import { pathFor, routes } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const linkClass =
  "text-xs font-medium text-foreground/70 transition-colors hover:text-foreground";

const buttonClass =
  "rounded-full border border-foreground/20 px-5 py-2 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground/40 hover:text-foreground backdrop-blur-sm bg-foreground/10";

export function SiteNav({
  dict,
  locale,
  page,
  signedIn,
  transparent = false,
}: {
  dict: Dictionary;
  locale: Locale;
  page: PageKey;
  signedIn: boolean;
  transparent?: boolean;
}) {
  const otherLocale: Locale = locale === "es" ? "en" : "es";

  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-foreground focus:px-5 focus:py-2 focus:text-xs focus:font-medium focus:text-background"
      >
        {dict.nav.skipToContent}
      </a>
      <nav
        aria-label={dict.nav.mainNav}
        className={`relative z-10 flex items-center justify-between gap-4 px-6 py-5 sm:px-10 ${
          transparent ? "" : "border-b border-border/50 bg-background"
        }`}
      >
        <Link
          href={pathFor("home", locale)}
          className="flex items-center gap-2"
          aria-label="Festora"
        >
          <Image
            src="/assets/logo.png"
            alt=""
            width={28}
            height={28}
            // logo.png es blanco: hay que invertirlo en modo claro o desaparece
            className="invert dark:invert-0"
            priority
          />
          <span className="text-sm font-semibold tracking-tight">Festora</span>
        </Link>

        <div className="flex items-center gap-5">
          <div className="hidden items-center gap-5 sm:flex">
            <Link href={pathFor("howItWorks", locale)} className={linkClass}>
              {dict.nav.howItWorks}
            </Link>
            <Link href={pathFor("pricing", locale)} className={linkClass}>
              {dict.nav.pricing}
            </Link>
            <Link href={pathFor("faq", locale)} className={linkClass}>
              {dict.nav.faq}
            </Link>
          </div>

          <Link
            href={routes[page][otherLocale]}
            hrefLang={otherLocale}
            className={linkClass}
            aria-label={dict.nav.languageLabel}
          >
            {dict.nav.otherLanguage}
          </Link>

          {signedIn ? (
            <Link href="/dashboard" className={buttonClass}>
              {dict.nav.dashboard}
            </Link>
          ) : (
            <SignInButton className={buttonClass} label={dict.nav.signIn} />
          )}
        </div>
      </nav>
    </>
  );
}

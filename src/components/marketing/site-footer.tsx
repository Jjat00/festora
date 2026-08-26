import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { pathFor, privacyPath } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const linkClass =
  "text-xs font-light text-muted-foreground transition-colors hover:text-foreground";

export function SiteFooter({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  return (
    <footer className="relative z-10 border-t border-border/50 bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12 sm:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Image
                src="/assets/logo.png"
                alt=""
                width={22}
                height={22}
                className="invert dark:invert-0"
              />
              <span className="text-sm font-semibold tracking-tight">Festora</span>
            </div>
            <p className="max-w-xs text-xs font-light leading-relaxed text-muted-foreground">
              {dict.footer.tagline}
            </p>
          </div>

          <nav
            aria-label={dict.nav.footerNav}
            className="flex flex-col gap-2 sm:flex-row sm:gap-6"
          >
            <Link href={pathFor("howItWorks", locale)} className={linkClass}>
              {dict.nav.howItWorks}
            </Link>
            <Link href={pathFor("pricing", locale)} className={linkClass}>
              {dict.nav.pricing}
            </Link>
            <Link href={pathFor("faq", locale)} className={linkClass}>
              {dict.nav.faq}
            </Link>
            <Link href={privacyPath} className={linkClass} hrefLang="es">
              {dict.footer.privacy}
              {dict.footer.privacyNote ? ` (${dict.footer.privacyNote})` : ""}
            </Link>
          </nav>
        </div>

        <p className="text-xs font-light text-muted-foreground">
          &copy; {new Date().getFullYear()} Festora. {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}

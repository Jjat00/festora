import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";
import type { Locale, PageKey } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/** Marco comun de las paginas de contenido: nav solida, `main` y pie. */
export function PageShell({
  dict,
  locale,
  page,
  signedIn,
  eyebrow,
  title,
  intro,
  children,
}: {
  dict: Dictionary;
  locale: Locale;
  page: PageKey;
  signedIn: boolean;
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteNav dict={dict} locale={locale} page={page} signedIn={signedIn} />

      <main id="contenido" className="flex-1">
        <header className="border-b border-border/50">
          <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {eyebrow}
            </span>
            <h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base font-light leading-relaxed text-muted-foreground">
              {intro}
            </p>
          </div>
        </header>

        {children}
      </main>

      <SiteFooter dict={dict} locale={locale} />
    </div>
  );
}

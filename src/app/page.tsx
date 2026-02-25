import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { CinematicHero } from "@/components/cinematic-hero";
import { SignInButton } from "@/components/sign-in-button";

export default async function Home() {
  const session = await auth();

  return (
    <div className="relative flex flex-col bg-background text-foreground">
      {/* ── Hero ── */}
      <CinematicHero>
        {/* Navbar */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
          <Image
            src="/assets/logo.png"
            alt="Festora"
            width={32}
            height={32}
            className="brightness-0 dark:invert"
            priority
          />
          {session?.user ? (
            <Link
              href="/dashboard"
              className="rounded-full border border-border px-5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
          ) : (
            <SignInButton />
          )}
        </nav>

        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
          <div className="flex flex-col items-center">
            <Image
              src="/assets/nombre.png"
              alt="Festora"
              width={600}
              height={250}
              className="w-[340px] md:w-[400px] lg:w-[600px] h-auto brightness-0 dark:invert opacity-90"
              priority
            />
            <p className="mt-6 max-w-sm text-center text-base font-light leading-relaxed text-muted-foreground">
              La forma más elegante de compartir tus fotos con tus clientes.
            </p>
            <div className="mt-10 flex items-center gap-4">
              {session?.user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-7 text-sm font-medium text-background transition-opacity hover:opacity-80"
                >
                  Ir al dashboard
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : (
                <SignInButton
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-7 text-sm font-medium text-background transition-opacity hover:opacity-80"
                  label="Comenzar gratis"
                />
              )}
            </div>
          </div>
        </main>

        {/* Scroll hint */}
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
            className="animate-bounce text-muted-foreground/40"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </CinematicHero>

      {/* ── Valor diferencial ── */}
      <section className="relative z-10 border-t border-border/50 bg-background">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:px-10 sm:py-32">
          {/* Section header */}
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Potenciado por IA
            </span>
            <h2 className="mt-6 text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
              No es solo una galería.
              <br />
              <span className="text-muted-foreground">Es tu asistente creativo.</span>
            </h2>
            <p className="mt-4 max-w-lg text-base font-light leading-relaxed text-muted-foreground">
              Festora combina entrega profesional de fotos con inteligencia artificial
              que entiende tus imágenes, ahorra tu tiempo y sorprende a tus clientes.
            </p>
          </div>

          {/* Feature grid */}
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1 */}
            <div className="group relative rounded-2xl border border-border/60 bg-muted/20 p-6 transition-colors hover:border-border hover:bg-muted/40">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                  <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5Z" />
                  <path d="M8.5 2.5A6.5 6.5 0 0 0 2 12c0 3.5 2.5 6.5 6 7.5" />
                  <path d="M15.5 2.5A6.5 6.5 0 0 1 22 12c0 3.5-2.5 6.5-6 7.5" />
                  <path d="M12 17v5" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold">Búsqueda inteligente</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                Tus clientes describen lo que buscan con palabras y la IA encuentra
                las fotos exactas. &ldquo;La foto junto al lago al atardecer&rdquo; — listo.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group relative rounded-2xl border border-border/60 bg-muted/20 p-6 transition-colors hover:border-border hover:bg-muted/40">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="m9 8 6 4-6 4V8Z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold">Highlights automáticos</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                La IA analiza composición, nitidez y emoción para generar una
                selección destacada antes de que tu cliente vea la galería.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group relative rounded-2xl border border-border/60 bg-muted/20 p-6 transition-colors hover:border-border hover:bg-muted/40">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                  <path d="M12 12v9" />
                  <path d="m8 17 4 4 4-4" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold">Entrega profesional</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                Galerías privadas con PIN, descargas protegidas y una experiencia
                premium que refleja la calidad de tu trabajo.
              </p>
            </div>

            {/* Card 4 */}
            <div className="group relative rounded-2xl border border-border/60 bg-muted/20 p-6 transition-colors hover:border-border hover:bg-muted/40">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <path d="M8 10h.01" />
                  <path d="M12 10h.01" />
                  <path d="M16 10h.01" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold">Chat con tu galería</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                Los clientes interactúan con un asistente que conoce cada foto.
                Preguntan, filtran y descubren su sesión de forma conversacional.
              </p>
            </div>

            {/* Card 5 */}
            <div className="group relative rounded-2xl border border-border/60 bg-muted/20 p-6 transition-colors hover:border-border hover:bg-muted/40">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                  <path d="M2 12h5" />
                  <path d="M17 12h5" />
                  <path d="M12 2v5" />
                  <path d="M12 17v5" />
                  <circle cx="12" cy="12" r="4" />
                  <path d="m4.93 4.93 2.83 2.83" />
                  <path d="m16.24 16.24 2.83 2.83" />
                  <path d="m4.93 19.07 2.83-2.83" />
                  <path d="m16.24 7.76 2.83-2.83" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold">Etiquetado automático</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                Cada foto se analiza al subirla: escena, emociones, colores
                dominantes. Organización sin esfuerzo para cientos de fotos.
              </p>
            </div>

            {/* Card 6 */}
            <div className="group relative rounded-2xl border border-border/60 bg-muted/20 p-6 transition-colors hover:border-border hover:bg-muted/40">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                  <path d="M12 3v18" />
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M3 15h18" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold">Hecho para fotógrafos</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                Sin plantillas genéricas. Cada detalle está diseñado para el flujo
                real de trabajo de un fotógrafo profesional.
              </p>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 flex flex-col items-center text-center">
            <p className="text-sm font-light text-muted-foreground">
              Deja que la inteligencia artificial trabaje por ti mientras tú
              te enfocas en crear.
            </p>
            <div className="mt-6">
              {session?.user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-7 text-sm font-medium text-background transition-opacity hover:opacity-80"
                >
                  Explorar dashboard
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : (
                <SignInButton
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-7 text-sm font-medium text-background transition-opacity hover:opacity-80"
                  label="Probar Festora gratis"
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

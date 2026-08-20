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
            className="dark:brightness-0 dark:invert"
            priority
          />
          {session?.user ? (
            <Link
              href="/dashboard"
              className="rounded-full border border-foreground/20 px-5 py-2 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground/40 hover:text-foreground backdrop-blur-sm bg-foreground/10"
            >
              Dashboard
            </Link>
          ) : (
            <SignInButton className="rounded-full border border-foreground/20 px-5 py-2 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground/40 hover:text-foreground backdrop-blur-sm bg-foreground/10" />
          )}
        </nav>

        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
          <div className="flex flex-col items-center">
            <Image
              src="/assets/nombre.png"
              alt="Festora"
              width={600}
              height={250}
              className="w-[340px] md:w-[400px] lg:w-[600px] h-auto invert dark:invert-0 opacity-95 drop-shadow-2xl"
              priority
            />
            <p className="mt-8 max-w-md text-center text-lg font-light leading-relaxed text-foreground/80 drop-shadow-md">
              Galerías privadas, curadas con IA, para compartir tus momentos
              solo con quien tú elijas.
            </p>
            <div className="mt-10 flex items-center gap-4">
              {session?.user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-8 text-sm font-medium text-background transition-opacity hover:opacity-90 shadow-xl"
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
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-8 text-sm font-medium text-background transition-opacity hover:opacity-90 shadow-xl"
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
            className="animate-bounce text-foreground/50"
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
              Festora organiza tus fotos, encuentra cualquier momento al instante
              y arma álbumes hermosos por ti. Tú solo eliges con quién compartirlos.
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
              <h3 className="text-sm font-semibold">Encuentra cualquier foto al instante</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                Describe con palabras lo que buscas y la IA la encuentra.
                &ldquo;El atardecer del viaje a la playa&rdquo; — listo, sin scrollear cientos de fotos.
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
              <h3 className="text-sm font-semibold">Las mejores, seleccionadas por ti</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                La IA analiza composición, nitidez y emoción para destacar las
                fotos que importan. Subes 500, compartes las 30 que valen la pena.
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
              <h3 className="text-sm font-semibold">Privado de verdad</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                Solo lo ve quien tú elijas. Link único o PIN, sin algoritmos
                ni feeds públicos. Tus recuerdos no son contenido para nadie más.
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
              <h3 className="text-sm font-semibold">Habla con tus recuerdos</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                Un asistente que conoce cada foto del álbum. Pregunta, filtra
                y redescubre tus momentos en lenguaje natural.
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
              <h3 className="text-sm font-semibold">Organización sin mover un dedo</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                Cada foto se analiza al subirla: escena, personas, lugar, colores.
                Tus álbumes se ordenan solos mientras tú haces otra cosa.
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
              <h3 className="text-sm font-semibold">Hermoso desde la primera foto</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                Sin plantillas genéricas ni redes sociales disfrazadas. Una
                galería elegante que hace que tus momentos se vean tan bien
                como los recuerdas.
              </p>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 flex flex-col items-center text-center">
            <p className="text-sm font-light text-muted-foreground">
              Deja que la IA organice tus recuerdos mientras tú te enfocas
              en vivirlos.
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
                  label="Crear tu primer álbum"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-border/50 bg-background">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-12 sm:flex-row sm:justify-between sm:px-10">
          <div className="flex items-center gap-3">
            <Image
              src="/assets/logo.png"
              alt="Festora"
              width={22}
              height={22}
              className="dark:brightness-0 dark:invert"
            />
            <span className="text-xs font-light text-muted-foreground">
              &copy; {new Date().getFullYear()} Festora
            </span>
          </div>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-6">
            <span className="text-xs font-light text-muted-foreground">
              Tus fotos son privadas. Nadie más las ve.
            </span>
            <Link
              href="/privacidad"
              className="text-xs font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Privacidad
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

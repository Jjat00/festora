import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import Particles from "@/components/particles";
import { SignInButton } from "@/components/sign-in-button";

export default async function Home() {
  const session = await auth();

  return (
    <div className="relative flex min-h-svh flex-col bg-background text-foreground">
      <Particles />

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

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center">
          {/* Brand name */}
          <Image
            src="/assets/nombre.png"
            alt="Festora"
            width={600}
            height={250}
            className="w-[340px] md:w-[400px] lg:w-[600px] h-auto brightness-0 dark:invert opacity-90"
            priority
          />

          {/* Tagline */}
          <p className="mt-6 max-w-sm text-center text-base font-light leading-relaxed text-muted-foreground">
            La forma más elegante de compartir tus fotos con tus clientes.
          </p>

          {/* CTAs */}
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
    </div>
  );
}

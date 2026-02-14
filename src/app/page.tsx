import Image from "next/image";
import Particles from "@/components/particles";

export default function Home() {
  return (
    <div className="relative flex min-h-svh flex-col bg-[#09090b] text-white">
      <Particles />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Image
          src="/assets/logo.png"
          alt="Festora"
          width={32}
          height={32}
          priority
        />
        <a
          href="#"
          className="rounded-full border border-[#27272a] px-5 py-2 text-xs font-medium text-[#a1a1aa] transition-colors hover:border-[#52525b] hover:text-white"
        >
          Acceder
        </a>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center">
          {/* Brand name */}
          <Image
            src="/assets/nombre.png"
            alt="Festora"
            width={340}
            height={68}
            className="brightness-0 invert opacity-90"
            priority
          />

          {/* Tagline */}
          <p className="mt-6 max-w-sm text-center text-base font-light leading-relaxed text-[#52525b]">
            La forma más elegante de compartir tus fotos con tus clientes.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex items-center gap-4">
            <a
              href="#"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-7 text-sm font-medium text-[#09090b] transition-opacity hover:opacity-80"
            >
              Comenzar gratis
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
            </a>
            <a
              href="#"
              className="inline-flex h-11 items-center rounded-full border border-[#27272a] px-7 text-sm font-light text-[#a1a1aa] transition-colors hover:border-[#52525b] hover:text-white"
            >
              Saber más
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

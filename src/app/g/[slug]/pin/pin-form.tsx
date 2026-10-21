"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

export function PinForm({ themed, title }: { themed: boolean; title: string | null }) {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/g/${params.slug}/verify-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });

    if (res.ok) {
      router.push(`/g/${params.slug}`);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error === "Invalid PIN" ? "PIN incorrecto" : data.error);
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {themed && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/themes/salvia/rosas-esquina.webp" alt="" aria-hidden className="salvia-rosas salvia-rosas--tl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/themes/salvia/rosas-esquina.webp" alt="" aria-hidden className="salvia-rosas salvia-rosas--br" />
        </>
      )}
      <div className="relative z-10 w-full max-w-sm">
        {themed ? (
          <>
            <p className="salvia-kicker mb-2 text-center">Álbum de recuerdos</p>
            <h1 className="salvia-script mb-3 text-center text-5xl leading-tight">{title}</h1>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              Escribe el PIN que te compartieron para ver y subir fotos
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-center text-2xl font-semibold">
              Galería protegida
            </h1>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              Ingresa el PIN para acceder
            </p>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-500">
              {error}
            </div>
          )}
          <input
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            maxLength={8}
            autoFocus
            className="w-full rounded-lg border border-border bg-transparent px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Acceder"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-light leading-relaxed text-muted-foreground">
          Esta galería está protegida con un PIN que ni nosotros podemos leer.
          Las fotos nunca son públicas.{" "}
          <Link
            href="/privacidad"
            className="font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Saber más
          </Link>
        </p>
      </div>
    </div>
  );
}

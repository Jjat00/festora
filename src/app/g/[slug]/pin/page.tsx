"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function PinPage() {
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
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-semibold">
          Galería protegida
        </h1>
        <p className="mb-8 text-center text-sm text-[var(--muted-foreground)]">
          Ingresa el PIN para acceder
        </p>

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
            className="w-full rounded-lg border border-[var(--border)] bg-transparent px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Acceder"}
          </button>
        </form>
      </div>
    </div>
  );
}

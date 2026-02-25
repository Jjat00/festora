"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { triggerAlbumGeneration } from "@/lib/actions/photo-actions";
import type { AlbumSuggestion } from "@prisma/client";

const CATEGORY_LABELS: Record<string, string> = {
  _highlights: "✦ Selección IA",
  preparativos: "Preparativos",
  ceremonia: "Ceremonia",
  retratos: "Retratos",
  pareja: "Pareja",
  grupo: "Grupo",
  familia: "Familia",
  ninos: "Niños",
  mascotas: "Mascotas",
  recepcion: "Recepción",
  fiesta: "Fiesta",
  comida: "Comida",
  decoracion: "Decoración",
  detalles: "Detalles",
  exterior: "Exterior",
  arquitectura: "Arquitectura",
  producto: "Producto",
  deportes: "Deportes",
  otro: "Otros",
};

export function AlbumGrid({
  projectId,
  albums,
  hasAnalyzedPhotos,
}: {
  projectId: string;
  albums: AlbumSuggestion[];
  hasAnalyzedPhotos: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      await triggerAlbumGeneration(projectId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando álbumes");
    } finally {
      setLoading(false);
    }
  }

  if (!hasAnalyzedPhotos) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Primero analiza las fotos con IA desde la pestaña <strong>Fotos</strong>.
        </p>
      </div>
    );
  }

  if (albums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
        <p className="mb-4 text-sm text-muted-foreground">
          Las fotos ya fueron analizadas. Genera álbumes automáticos basados en las categorías detectadas.
        </p>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
              Generando...
            </>
          ) : (
            <>
              <span aria-hidden>✦</span>
              Generar álbumes con IA
            </>
          )}
        </button>
        {error && (
          <p className="mt-3 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {albums.length} álbum{albums.length !== 1 ? "es" : ""} sugerido{albums.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40"
        >
          {loading ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Regenerando...
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerar
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {/* Album cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map((album) => (
          <Link
            key={album.id}
            href={`/projects/${projectId}/albums/${album.id}`}
            className="group overflow-hidden rounded-xl border border-border transition-colors hover:border-muted-foreground"
          >
            {/* Cover photo */}
            <div className="relative aspect-[4/3] bg-muted">
              {album.coverPhotoId ? (
                <img
                  src={`/api/photo/${album.coverPhotoId}/thumbnail`}
                  alt={album.name}
                  className="h-full w-full object-cover brightness-90 transition-all group-hover:brightness-100"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl text-muted-foreground/30">
                  ⊞
                </div>
              )}

              {/* Photo count overlay */}
              <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                {album.photoCount} foto{album.photoCount !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Info */}
            <div className="px-4 py-3">
              <h3 className="font-medium leading-snug">{album.name}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {album.category === "_highlights"
                  ? `${album.photoCount} mejores fotos · IA`
                  : `${album.photoCount} fotos curadas · ${CATEGORY_LABELS[album.category] ?? album.category}`}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

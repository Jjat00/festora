"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { deletePhoto } from "@/lib/actions/photo-actions";
import { Lightbox } from "@/components/lightbox";
import type { Photo } from "@prisma/client";

type PhotoWithSelection = Photo & { selection: { id: string } | null };
type SortMode = "order" | "quality";

function AiBadge({ photo }: { photo: PhotoWithSelection }) {
  if (photo.aiStatus === "PENDING" || photo.aiStatus === "QUEUED") {
    return (
      <div className="absolute left-2 top-2 rounded-full bg-black/60 p-1.5">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  // Solo badge positivo — "★ Destacada" si el composite score es alto.
  // Evitamos badges negativos de blur que generan falsos positivos con bokeh.
  const isGreat =
    photo.compositeScore !== null && photo.compositeScore >= 65;

  if (!isGreat) return null;

  return (
    <div className="absolute left-2 top-2">
      <span className="rounded-full bg-yellow-500/90 px-2 py-0.5 text-[10px] font-semibold leading-4 text-white">
        ★ Destacada
      </span>
    </div>
  );
}

export function PhotoGrid({
  photos,
  projectId,
}: {
  photos: PhotoWithSelection[];
  projectId: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [sort, setSort] = useState<SortMode>("order");

  const hasAiData = photos.some(
    (p) => p.aiStatus === "DONE" || p.aiStatus === "FAILED"
  );

  const sorted = useMemo(() => {
    if (sort === "quality") {
      return [...photos].sort(
        (a, b) => (b.compositeScore ?? -1) - (a.compositeScore ?? -1)
      );
    }
    return photos;
  }, [photos, sort]);

  async function handleDelete(photoId: string) {
    if (!confirm("¿Eliminar esta foto?")) return;
    setDeleting(photoId);
    try {
      await deletePhoto(photoId);
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      {/* Toolbar de ordenación — solo visible cuando hay datos de IA */}
      {hasAiData && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(
            [
              { mode: "order", label: "Orden original" },
              { mode: "quality", label: "★ Mejores primero" },
            ] as { mode: SortMode; label: string }[]
          ).map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setSort(mode)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                sort === mode
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((photo, i) => (
          <div
            key={photo.id}
            className={`group relative overflow-hidden rounded-lg border border-[var(--border)] ${
              photo.selection ? "ring-2 ring-[var(--accent)]" : ""
            }`}
          >
            <div
              className="aspect-square cursor-pointer bg-[var(--muted)]"
              onClick={() => setLightboxIndex(i)}
            >
              {photo.thumbnailKey && (
                <img
                  src={`/api/photo/${photo.id}/thumbnail`}
                  alt={photo.originalFilename}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </div>

            {/* Overlay con acciones */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="truncate text-xs text-white">
                {photo.originalFilename}
              </p>
              <div className="mt-1 flex gap-3">
                <a
                  href={`/api/photo/${photo.id}/download`}
                  download
                  className="text-xs text-white/80 hover:text-white"
                >
                  Descargar
                </a>
                <button
                  onClick={() => handleDelete(photo.id)}
                  disabled={deleting === photo.id}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  {deleting === photo.id ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>

            {/* Badge de IA — esquina superior izquierda */}
            <AiBadge photo={photo} />

            {/* Corazón de selección — esquina superior derecha */}
            {photo.selection && (
              <div className="absolute right-2 top-2 rounded-full bg-[var(--accent)] p-1">
                <svg
                  className="h-3 w-3 text-[var(--accent-foreground)]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={sorted.map((p) => ({
            id: p.id,
            filename: p.originalFilename,
          }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          showDownload
        />
      )}
    </>
  );
}

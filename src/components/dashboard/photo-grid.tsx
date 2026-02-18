"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePhoto } from "@/lib/actions/photo-actions";
import { Lightbox } from "@/components/lightbox";
import type { Photo } from "@prisma/client";

type PhotoWithSelection = Photo & { selection: { id: string } | null };

function PhotoCard({
  photo,
  index,
  isDeleting,
  onOpen,
  onDelete,
}: {
  photo: PhotoWithSelection;
  index: number;
  isDeleting: boolean;
  onOpen: (i: number) => void;
  onDelete: (id: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const ratio =
    photo.width && photo.height ? `${photo.width} / ${photo.height}` : "4 / 3";

  return (
    <div
      className={`group relative mb-4 break-inside-avoid overflow-hidden rounded-lg border border-[var(--border)] transition-all ${
        photo.selection ? "ring-2 ring-[var(--accent)]" : ""
      }`}
    >
      {/* Contenedor con aspect-ratio para prevenir layout shift */}
      <div
        className="relative w-full cursor-zoom-in overflow-hidden rounded-lg"
        style={{ aspectRatio: ratio }}
        onClick={() => onOpen(index)}
      >
        {/* Shimmer — usa opacity para no bloquear lazy loading */}
        <div
          className={`absolute inset-0 bg-[var(--muted)] transition-opacity duration-300 ${
            loaded ? "opacity-0" : "animate-pulse opacity-100"
          }`}
        />
        <img
          src={`/api/photo/${photo.id}/thumbnail`}
          alt={photo.originalFilename}
          className={`absolute inset-0 h-full w-full object-cover brightness-90 transition-all duration-500 will-change-auto group-hover:brightness-100 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          style={{ transform: "translate3d(0, 0, 0)" }}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      </div>

      {/* Hover overlay with actions */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 p-2 opacity-0 transition-opacity group-hover:opacity-100">
        <p className="truncate text-xs text-white">{photo.originalFilename}</p>
        <div className="mt-1 flex gap-3">
          <a
            href={`/api/photo/${photo.id}/download`}
            download
            className="text-xs text-white/80 hover:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            Descargar
          </a>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(photo.id);
            }}
            disabled={isDeleting}
            className="text-xs text-red-400 hover:text-red-300"
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>

      {/* Selection indicator */}
      {photo.selection && (
        <div className="absolute right-2 top-2 rounded-full bg-[var(--accent)] p-1">
          <svg className="h-3 w-3 text-[var(--accent-foreground)]" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
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
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {photos.map((photo, i) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            index={i}
            isDeleting={deleting === photo.id}
            onOpen={setLightboxIndex}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos.map((p) => ({
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

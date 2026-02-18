"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deletePhoto, deletePhotos } from "@/lib/actions/photo-actions";
import { Lightbox } from "@/components/lightbox";
import type { Photo } from "@prisma/client";

type PhotoWithSelection = Photo & { selection: { id: string } | null };

function PhotoCard({
  photo,
  index,
  isDeleting,
  isSelecting,
  isSelected,
  onOpen,
  onToggleSelect,
  onDelete,
}: {
  photo: PhotoWithSelection;
  index: number;
  isDeleting: boolean;
  isSelecting: boolean;
  isSelected: boolean;
  onOpen: (i: number) => void;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const ratio =
    photo.width && photo.height ? `${photo.width} / ${photo.height}` : "4 / 3";

  // On SSR hydration, onLoad can fire before React attaches the handler
  // (image already in browser cache). Check img.complete after mount.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <div
      className={`group relative mb-4 break-inside-avoid overflow-hidden rounded-lg border border-[var(--border)] transition-all ${
        isSelected
          ? "ring-2 ring-[var(--foreground)]"
          : photo.selection
            ? "ring-2 ring-[var(--accent)]"
            : ""
      }`}
    >
      <div
        className={`relative w-full overflow-hidden rounded-lg ${
          isSelecting ? "cursor-pointer" : "cursor-zoom-in"
        }`}
        style={{ aspectRatio: ratio }}
        onClick={() => {
          if (isSelecting) onToggleSelect(photo.id);
          else onOpen(index);
        }}
      >
        {/* Shimmer */}
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
          ref={imgRef}
          style={{ transform: "translate3d(0, 0, 0)" }}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />

        {/* Selection checkbox */}
        {isSelecting && (
          <div className="absolute left-2 top-2 z-10">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                isSelected
                  ? "border-[var(--foreground)] bg-[var(--foreground)]"
                  : "border-white bg-black/40"
              }`}
            >
              {isSelected && (
                <svg
                  className="h-3 w-3 text-[var(--background)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hover overlay with actions — hidden in selection mode */}
      {!isSelecting && (
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
      )}

      {/* Favorita indicator */}
      {photo.selection && !isSelecting && (
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

  // Multi-select state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function cancelSelection() {
    setIsSelecting(false);
    setSelectedIds(new Set());
  }

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

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `¿Eliminar ${selectedIds.size} foto${selectedIds.size !== 1 ? "s" : ""}? Esta acción no se puede deshacer.`
      )
    )
      return;

    setIsBulkDeleting(true);
    try {
      await deletePhotos(Array.from(selectedIds), projectId);
      cancelSelection();
      router.refresh();
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        {isSelecting ? (
          <>
            <span className="text-sm text-[var(--muted-foreground)]">
              {selectedIds.size > 0
                ? `${selectedIds.size} seleccionada${selectedIds.size !== 1 ? "s" : ""}`
                : "Toca fotos para seleccionar"}
            </span>
            <div className="flex items-center gap-2">
              {selectedIds.size < photos.length ? (
                <button
                  onClick={() => setSelectedIds(new Set(photos.map((p) => p.id)))}
                  className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  Seleccionar todo
                </button>
              ) : (
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  Deseleccionar todo
                </button>
              )}
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || isBulkDeleting}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isBulkDeleting
                  ? "Eliminando..."
                  : `Eliminar${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
              </button>
              <button
                onClick={cancelSelection}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--foreground)]"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => setIsSelecting(true)}
            className="ml-auto text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Seleccionar
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {photos.map((photo, i) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            index={i}
            isDeleting={deleting === photo.id}
            isSelecting={isSelecting}
            isSelected={selectedIds.has(photo.id)}
            onOpen={setLightboxIndex}
            onToggleSelect={toggleSelect}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {lightboxIndex !== null && !isSelecting && (
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

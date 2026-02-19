"use client";

import { useState, useTransition } from "react";
import { toggleSelection } from "@/lib/actions/selection-actions";
import { Lightbox } from "@/components/lightbox";

interface GalleryPhoto {
  id: string;
  thumbnailKey: string | null;
  filename: string;
  selected: boolean;
  width?: number | null;
  height?: number | null;
}

function PhotoCard({
  photo,
  index,
  isLocked,
  isPending,
  onOpen,
  onToggle,
}: {
  photo: GalleryPhoto;
  index: number;
  isLocked: boolean;
  isPending: boolean;
  onOpen: (i: number) => void;
  onToggle: (id: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const ratio =
    photo.width && photo.height ? `${photo.width} / ${photo.height}` : "4 / 3";

  return (
    <div
      className={`group relative mb-4 break-inside-avoid cursor-zoom-in overflow-hidden rounded-lg transition-all ${
        photo.selected
          ? "ring-2 ring-accent ring-offset-2 ring-offset-background"
          : ""
      }`}
      onClick={() => onOpen(index)}
    >
      {/* Contenedor con aspect-ratio fijo para evitar layout shift */}
      <div className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: ratio }}>
        {/* Shimmer placeholder — se oculta con opacity cuando carga la imagen */}
        <div
          className={`absolute inset-0 bg-muted transition-opacity duration-300 ${
            loaded ? "opacity-0" : "animate-pulse opacity-100"
          }`}
        />

        {/* Imagen — SIEMPRE renderizada con opacity (nunca display:none) para que
            lazy loading funcione correctamente en todos los navegadores */}
        <img
          src={`/api/photo/${photo.id}/thumbnail`}
          alt={photo.filename}
          className={`absolute inset-0 h-full w-full object-cover brightness-90 transition-all duration-500 will-change-auto group-hover:brightness-110 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          style={{ transform: "translate3d(0, 0, 0)" }}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      </div>

      {/* Botón de favorita */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(photo.id);
        }}
        disabled={isLocked || isPending}
        className={`absolute right-2 top-2 rounded-full p-1.5 backdrop-blur-sm transition-all ${
          photo.selected
            ? "bg-accent text-accent-foreground"
            : "bg-black/40 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-black/60 hover:text-white"
        } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
        aria-label={photo.selected ? "Quitar de favoritas" : "Agregar a favoritas"}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill={photo.selected ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            fillRule="evenodd"
            d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

export function GalleryView({
  projectId,
  photos,
  totalSelected: initialTotal,
  isLocked,
}: {
  projectId: string;
  photos: GalleryPhoto[];
  totalSelected: number;
  isLocked: boolean;
}) {
  const [photoStates, setPhotoStates] = useState(photos);
  const [total, setTotal] = useState(initialTotal);
  const [isPending, startTransition] = useTransition();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  function handleToggle(photoId: string) {
    if (isLocked) return;

    startTransition(async () => {
      const result = await toggleSelection(projectId, photoId);
      setPhotoStates((prev) =>
        prev.map((p) =>
          p.id === photoId ? { ...p, selected: result.selected } : p
        )
      );
      setTotal(result.totalSelected);
    });
  }

  return (
    <div>
      {/* Contador sticky de favoritas */}
      <div className="sticky top-0 z-10 mb-6 flex items-center justify-center bg-background/90 py-3 backdrop-blur-sm">
        <div className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
          {total} favorita{total !== 1 && "s"}
        </div>
      </div>

      {/* Layout masonry con columnas CSS */}
      <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
        {photoStates.map((photo, i) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            index={i}
            isLocked={isLocked}
            isPending={isPending}
            onOpen={setLightboxIndex}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photoStates.map((p) => ({
            id: p.id,
            filename: p.filename,
            selected: p.selected,
          }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onToggleSelection={isLocked ? undefined : handleToggle}
        />
      )}
    </div>
  );
}

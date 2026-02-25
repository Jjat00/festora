"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import {
  toggleSelection,
  computeSmartOrder,
} from "@/lib/actions/selection-actions";
import { Lightbox } from "@/components/lightbox";

interface GalleryPhoto {
  id: string;
  thumbnailKey: string | null;
  filename: string;
  selected: boolean;
  width?: number | null;
  height?: number | null;
  category?: string | null;
  compositeScore?: number | null;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  return (
    <div
      className={`group relative cursor-zoom-in overflow-hidden rounded-lg transition-all ${
        photo.selected
          ? "ring-2 ring-accent ring-offset-2 ring-offset-background"
          : ""
      }`}
      onClick={() => onOpen(index)}
    >
      <div className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: "3 / 2" }}>
        <div
          className={`absolute inset-0 bg-muted transition-opacity duration-300 ${
            loaded ? "opacity-0" : "animate-pulse opacity-100"
          }`}
        />
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
  const [smartOrderApplied, setSmartOrderApplied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const shouldRecalculate = useCallback(
    (count: number) => count >= 5 && (count === 5 || (count - 5) % 3 === 0),
    []
  );

  // Categorías disponibles con conteo, ordenadas por cantidad
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of photoStates) {
      if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [photoStates]);

  // Mostrar tab "Destacadas" solo si hay fotos con score
  const destacadasCount = useMemo(() => {
    const withScore = photoStates
      .filter((p) => p.compositeScore != null)
      .sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0));
    return Math.max(10, Math.ceil(withScore.length * 0.2));
  }, [photoStates]);

  const hasDestacadas = useMemo(
    () => photoStates.some((p) => p.compositeScore != null),
    [photoStates]
  );

  // Fotos visibles según el tab activo
  const visiblePhotos = useMemo(() => {
    if (activeCategory === null) return photoStates;
    if (activeCategory === "_favorites") return photoStates.filter((p) => p.selected);
    if (activeCategory === "destacadas") {
      return [...photoStates]
        .filter((p) => p.compositeScore != null)
        .sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0))
        .slice(0, destacadasCount);
    }
    return photoStates.filter((p) => p.category === activeCategory);
  }, [photoStates, activeCategory, destacadasCount]);

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

      // Si estaba en Mis favoritas y ya no queda ninguna, volver a Todas
      if (result.totalSelected === 0 && activeCategory === "_favorites") {
        setActiveCategory(null);
      }

      if (result.totalSelected >= 5 && shouldRecalculate(result.totalSelected)) {
        const orderedIds = await computeSmartOrder(projectId);
        const idOrder = new Map(orderedIds.map((id, i) => [id, i]));

        setPhotoStates((prev) => {
          const updated = prev.map((p) =>
            p.id === photoId ? { ...p, selected: result.selected } : p
          );
          return [...updated].sort(
            (a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0)
          );
        });

        if (!smartOrderApplied) {
          setSmartOrderApplied(true);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 4000);
        }
      }
    });
  }

  const tabBase =
    "shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors whitespace-nowrap";
  const tabActive = "bg-foreground text-background";
  const tabInactive = "text-muted-foreground hover:text-foreground";

  return (
    <div>
      {/* Barra sticky: tabs de categoría + contador */}
      <div className="sticky top-0 z-10 mb-6 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-1 py-3">
          {/* Tabs — scrollables en móvil */}
          <div className="flex flex-1 gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              onClick={() => setActiveCategory(null)}
              className={`${tabBase} ${activeCategory === null ? tabActive : tabInactive}`}
            >
              Todas
              <span className="ml-1.5 opacity-60">{photoStates.length}</span>
            </button>

            {total > 0 && (
              <button
                onClick={() => setActiveCategory("_favorites")}
                className={`${tabBase} ${activeCategory === "_favorites" ? tabActive : tabInactive}`}
              >
                ♥ Mis favoritas
                <span className="ml-1.5 opacity-60">{total}</span>
              </button>
            )}

            {hasDestacadas && (
              <button
                onClick={() => setActiveCategory("destacadas")}
                className={`${tabBase} ${activeCategory === "destacadas" ? tabActive : tabInactive}`}
              >
                ✦ Destacadas
              </button>
            )}

            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`${tabBase} ${activeCategory === cat.name ? tabActive : tabInactive}`}
              >
                {capitalize(cat.name)}
                <span className="ml-1.5 opacity-60">{cat.count}</span>
              </button>
            ))}
          </div>

          {/* Contador de favoritas */}
          <div className="shrink-0 rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
            {total} favorita{total !== 1 && "s"}
          </div>
        </div>
      </div>

      {/* Mensaje cuando una categoría no tiene fotos */}
      {visiblePhotos.length === 0 && (
        <p className="py-20 text-center text-sm text-muted-foreground">
          No hay fotos en esta categoría
        </p>
      )}

      {/* Grid — lectura izquierda a derecha */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {visiblePhotos.map((photo, i) => (
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

      {/* Lightbox — navega dentro de la vista activa */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={visiblePhotos.map((p) => ({
            id: p.id,
            filename: p.filename,
            selected: p.selected,
          }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onToggleSelection={isLocked ? undefined : handleToggle}
        />
      )}

      {/* Toast de reordenamiento inteligente */}
      <div
        className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 text-sm text-background shadow-lg transition-all duration-500 ${
          showToast
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        Reordenamos las fotos según tus gustos
      </div>
    </div>
  );
}

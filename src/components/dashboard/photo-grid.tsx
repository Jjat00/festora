"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePhoto, deletePhotos } from "@/lib/actions/photo-actions";
import { toggleSelection } from "@/lib/actions/selection-actions";
import { Lightbox } from "@/components/lightbox";
import type { Prisma } from "@prisma/client";

type PhotoWithSelection = Prisma.PhotoGetPayload<{
  include: { selection: { select: { id: true } } };
}>;
type SortMode = "order" | "score" | "category";

function AiBadge({ photo }: { photo: PhotoWithSelection }) {
  // Spinner solo cuando está en cola/procesando activamente
  if (photo.aiStatus === "QUEUED") {
    return (
      <div className="absolute left-2 top-2 rounded-full bg-black/60 p-1.5">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  // LLM: Descartar tiene prioridad sobre Destacada
  if (photo.llmDiscardReason) {
    return (
      <div className="absolute left-2 top-2">
        <span
          title={photo.llmDiscardReason}
          className="rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-semibold leading-4 text-white"
        >
          ⚠ Descartar
        </span>
      </div>
    );
  }

  // LLM: Mejor del grupo
  if (photo.llmBestInGroup) {
    return (
      <div className="absolute left-2 top-2">
        <span className="rounded-full bg-blue-500/90 px-2 py-0.5 text-[10px] font-semibold leading-4 text-white">
          ★ Mejor
        </span>
      </div>
    );
  }

  // Score técnico: Destacada si composite score alto
  const isGreat = photo.compositeScore != null && photo.compositeScore >= 65;
  if (!isGreat) return null;

  return (
    <div className="absolute left-2 top-2">
      <span className="rounded-full bg-yellow-500/90 px-2 py-0.5 text-[10px] font-semibold leading-4 text-white">
        ★ Destacada
      </span>
    </div>
  );
}

function LlmScoreBadge({ photo }: { photo: PhotoWithSelection }) {
  if (photo.llmScore == null) return null;
  return (
    <div className="absolute right-2 top-2">
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold leading-4 tabular-nums ${
          photo.llmDiscardReason
            ? "bg-red-600/80 text-white"
            : photo.llmScore >= 8
              ? "bg-green-600/80 text-white"
              : photo.llmScore >= 6
                ? "bg-yellow-600/80 text-white"
                : "bg-black/60 text-white/80"
        }`}
      >
        {photo.llmScore.toFixed(1)}/10
      </span>
    </div>
  );
}

function PhotoCard({
  photo,
  index,
  isDeleting,
  isSelecting,
  isSelected,
  isFavorited,
  isFavPending,
  onOpen,
  onToggleSelect,
  onDelete,
  onToggleFavorite,
}: {
  photo: PhotoWithSelection;
  index: number;
  isDeleting: boolean;
  isSelecting: boolean;
  isSelected: boolean;
  isFavorited: boolean;
  isFavPending: boolean;
  onOpen: (i: number) => void;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const aspect =
    photo.width && photo.height ? photo.width / photo.height : 3 / 2;
  const ratio =
    photo.width && photo.height
      ? `${photo.width} / ${photo.height}`
      : "3 / 2";

  return (
    <div
      className={`group relative overflow-hidden border border-border transition-all ${
        isSelected
          ? "ring-1 ring-foreground/50"
          : photo.selection
            ? "ring-1 ring-accent/50"
            : ""
      }`}
      style={{
        flexGrow: aspect,
        flexBasis: `calc(${aspect} * var(--target-height, 120px))`,
      }}
    >
      <div
        className={`relative w-full overflow-hidden ${
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
          className={`absolute inset-0 bg-muted transition-opacity duration-300 ${
            loaded ? "opacity-0" : "animate-pulse opacity-100"
          }`}
        />
        <img
          src={`/api/photo/${photo.id}/thumbnail`}
          alt={photo.originalFilename}
          className={`absolute inset-0 h-full w-full object-cover brightness-90 transition-all duration-500 will-change-auto group-hover:brightness-100 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          ref={(node) => {
            if (node?.complete) setLoaded(true);
          }}
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
                  ? "border-foreground bg-foreground"
                  : "border-white bg-black/40"
              }`}
            >
              {isSelected && (
                <svg
                  className="h-3 w-3 text-background"
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
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <p className="truncate text-xs text-white">
            {photo.originalFilename}
          </p>
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

      {/* Badges de IA — izquierda */}
      {!isSelecting && <AiBadge photo={photo} />}

      {/* Score badge — top-right */}
      {!isSelecting && !isFavorited && <LlmScoreBadge photo={photo} />}

      {/* Botón de favorita — top-right, reemplaza el score cuando está activo */}
      {!isSelecting && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(photo.id);
          }}
          disabled={isFavPending}
          className={`absolute right-2 top-2 rounded-full p-1.5 backdrop-blur-sm transition-all ${
            isFavorited
              ? "bg-accent text-accent-foreground"
              : "bg-black/40 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-black/60 hover:text-white"
          } ${isFavPending ? "opacity-50" : ""}`}
          aria-label={isFavorited ? "Quitar favorita" : "Marcar como favorita"}
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill={isFavorited ? "currentColor" : "none"}
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
  const [sort, setSort] = useState<SortMode>("order");
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(photos.filter((p) => p.selection).map((p) => p.id)),
  );
  const [favPending, setFavPending] = useState<string | null>(null);
  const [, startFavTransition] = useTransition();

  const hasAiData = photos.some((p) => p.aiStatus === "DONE");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Categorías únicas disponibles
  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    for (const p of photos) {
      if (p.llmCategory) {
        cats.set(p.llmCategory, (cats.get(p.llmCategory) ?? 0) + 1);
      }
    }
    return Array.from(cats.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [photos]);

  const sorted = useMemo(() => {
    let filtered = categoryFilter
      ? photos.filter((p) => p.llmCategory === categoryFilter)
      : photos;

    if (sort === "score") {
      return [...filtered].sort(
        (a, b) => (b.compositeScore ?? -1) - (a.compositeScore ?? -1),
      );
    }
    if (sort === "category") {
      return [...filtered].sort((a, b) => {
        const catA = a.llmCategory ?? "zzz";
        const catB = b.llmCategory ?? "zzz";
        if (catA !== catB) return catA.localeCompare(catB);
        return (b.compositeScore ?? -1) - (a.compositeScore ?? -1);
      });
    }
    return filtered;
  }, [photos, sort, categoryFilter]);

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

  function handleFavoriteToggle(photoId: string) {
    setFavPending(photoId);
    // Actualización optimista
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
    startFavTransition(async () => {
      try {
        await toggleSelection(projectId, photoId);
      } catch {
        // Revertir si falla
        setFavorites((prev) => {
          const next = new Set(prev);
          if (next.has(photoId)) next.delete(photoId);
          else next.add(photoId);
          return next;
        });
      } finally {
        setFavPending(null);
      }
    });
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
        `¿Eliminar ${selectedIds.size} foto${selectedIds.size !== 1 ? "s" : ""}? Esta acción no se puede deshacer.`,
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
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0
                ? `${selectedIds.size} seleccionada${selectedIds.size !== 1 ? "s" : ""}`
                : "Toca fotos para seleccionar"}
            </span>
            <div className="flex items-center gap-2">
              {selectedIds.size < photos.length ? (
                <button
                  onClick={() =>
                    setSelectedIds(new Set(photos.map((p) => p.id)))
                  }
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Seleccionar todo
                </button>
              ) : (
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-sm text-muted-foreground hover:text-foreground"
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
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-foreground"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <div className="flex w-full items-center justify-between">
            {hasAiData && (
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { mode: "order" as SortMode, label: "Orden original" },
                    { mode: "score" as SortMode, label: "★ Mejor score" },
                    { mode: "category" as SortMode, label: "⊞ Categoría" },
                  ] as { mode: SortMode; label: string }[]
                ).map(({ mode, label }) => (
                  <button
                    key={mode}
                    onClick={() => setSort(mode)}
                    className={`rounded-full px-3 py-1 text-xs transition-colors ${
                      sort === mode
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setIsSelecting(true)}
              className="ml-auto text-sm text-muted-foreground hover:text-foreground"
            >
              Seleccionar
            </button>
          </div>
        )}
      </div>

      {/* Category filter chips */}
      {categories.length > 1 && !isSelecting && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              categoryFilter === null
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Todas ({photos.length})
          </button>
          {categories.map(({ name, count }) => (
            <button
              key={name}
              onClick={() =>
                setCategoryFilter(categoryFilter === name ? null : name)
              }
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                categoryFilter === name
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {name} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {sort === "category" && !categoryFilter ? (
        // Grouped by category with section headers
        <div className="space-y-6">
          {categories.map(({ name }) => {
            const catPhotos = sorted.filter((p) => p.llmCategory === name);
            if (catPhotos.length === 0) return null;
            return (
              <div key={name}>
                <h3 className="mb-3 text-sm font-semibold capitalize text-foreground">
                  {name}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({catPhotos.length})
                  </span>
                </h3>
                <div
                  className="flex flex-wrap gap-px after:content-[''] after:grow-10"
                  style={{ "--target-height": "clamp(120px, 15vw, 250px)" } as React.CSSProperties}
                >
                  {catPhotos.map((photo) => {
                    const globalIndex = sorted.indexOf(photo);
                    return (
                      <PhotoCard
                        key={photo.id}
                        photo={photo}
                        index={globalIndex}
                        isDeleting={deleting === photo.id}
                        isSelecting={isSelecting}
                        isSelected={selectedIds.has(photo.id)}
                        isFavorited={favorites.has(photo.id)}
                        isFavPending={favPending === photo.id}
                        onOpen={setLightboxIndex}
                        onToggleSelect={toggleSelect}
                        onDelete={handleDelete}
                        onToggleFavorite={handleFavoriteToggle}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
          {/* Fotos sin categoría */}
          {sorted.some((p) => !p.llmCategory) && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Sin categoría{" "}
                <span className="font-normal text-muted-foreground">
                  ({sorted.filter((p) => !p.llmCategory).length})
                </span>
              </h3>
              <div
                className="flex flex-wrap gap-px after:content-[''] after:grow-10"
                style={{ "--target-height": "clamp(120px, 15vw, 250px)" } as React.CSSProperties}
              >
                {sorted
                  .filter((p) => !p.llmCategory)
                  .map((photo) => {
                    const globalIndex = sorted.indexOf(photo);
                    return (
                      <PhotoCard
                        key={photo.id}
                        photo={photo}
                        index={globalIndex}
                        isDeleting={deleting === photo.id}
                        isSelecting={isSelecting}
                        isSelected={selectedIds.has(photo.id)}
                        isFavorited={favorites.has(photo.id)}
                        isFavPending={favPending === photo.id}
                        onOpen={setLightboxIndex}
                        onToggleSelect={toggleSelect}
                        onDelete={handleDelete}
                        onToggleFavorite={handleFavoriteToggle}
                      />
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex flex-wrap gap-px after:content-[''] after:grow-10"
          style={{ "--target-height": "clamp(120px, 15vw, 250px)" } as React.CSSProperties}
        >
          {sorted.map((photo, i) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              index={i}
              isDeleting={deleting === photo.id}
              isSelecting={isSelecting}
              isSelected={selectedIds.has(photo.id)}
              isFavorited={favorites.has(photo.id)}
              isFavPending={favPending === photo.id}
              onOpen={setLightboxIndex}
              onToggleSelect={toggleSelect}
              onDelete={handleDelete}
              onToggleFavorite={handleFavoriteToggle}
            />
          ))}
        </div>
      )}

      {lightboxIndex !== null && !isSelecting && (
        <Lightbox
          photos={sorted.map((p) => ({
            id: p.id,
            filename: p.originalFilename,
            selected: favorites.has(p.id),
            compositeScore: p.compositeScore,
            blurScore: p.blurScore,
            emotionLabel: p.emotionLabel,
            llmScore: p.llmScore,
            llmSummary: p.llmSummary,
            llmDiscardReason: p.llmDiscardReason,
            llmHighlights: p.llmHighlights,
            llmIssues: p.llmIssues,
            llmComposition: p.llmComposition,
            llmPoseQuality: p.llmPoseQuality,
            llmBackgroundQuality: p.llmBackgroundQuality,
            llmCategory: p.llmCategory,
            llmTags: p.llmTags,
          }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onToggleSelection={handleFavoriteToggle}
          showDownload
        />
      )}
    </>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateAlbumName, deleteAlbum } from "@/lib/actions/album-actions";
import { Lightbox, type LightboxPhoto } from "@/components/lightbox";
import type { AlbumSuggestion, Prisma } from "@prisma/client";

type PhotoWithSelection = Prisma.PhotoGetPayload<{
  include: { selection: { select: { id: true } } };
}>;

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

function LlmScoreBadge({ photo }: { photo: PhotoWithSelection }) {
  if (photo.llmScore == null) return null;
  return (
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
  );
}

export function AlbumDetail({
  album,
  photos,
  projectId,
}: {
  album: AlbumSuggestion;
  photos: PhotoWithSelection[];
  projectId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(album.name);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function handleSaveName() {
    if (!name.trim() || name.trim() === album.name) {
      setName(album.name);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updateAlbumName(album.id, name);
      setEditing(false);
      router.refresh();
    } catch {
      setName(album.name);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAlbum(album.id);
      router.push(`/projects/${projectId}/albums`);
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  function handleDownload() {
    window.open(
      `/api/projects/${projectId}/download?type=album&category=${encodeURIComponent(album.category)}`,
      "_blank"
    );
  }

  const lightboxPhotos: LightboxPhoto[] = photos.map((p) => ({
    id: p.id,
    filename: p.originalFilename,
    selected: !!p.selection,
    compositeScore: p.compositeScore,
    blurScore: p.blurScore,
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
  }));

  const coverPhoto = photos[0];
  const categoryLabel = CATEGORY_LABELS[album.category] ?? album.category;

  return (
    <div className="-mx-6 -mt-6">
      {/* Hero / Cover */}
      <div className="relative aspect-[21/9] w-full overflow-hidden bg-muted">
        {/* Blurred backdrop */}
        {coverPhoto && (
          <img
            src={`/api/photo/${coverPhoto.id}/thumbnail`}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-50"
            aria-hidden
          />
        )}

        {/* Cover image */}
        {coverPhoto && (
          <img
            src={`/api/photo/${coverPhoto.id}/view`}
            alt={album.name}
            className="relative z-10 mx-auto h-full object-contain"
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Back button */}
        <Link
          href={`/projects/${projectId}/albums`}
          className="absolute left-4 top-4 z-30 flex items-center gap-1.5 rounded-lg bg-black/40 px-3 py-1.5 text-sm text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Álbumes
        </Link>

        {/* Action buttons */}
        <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg bg-black/40 p-2 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60"
            title="Editar nombre"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleDownload}
            className="rounded-lg bg-black/40 p-2 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60"
            title="Descargar ZIP"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg bg-black/40 p-2 text-red-400 backdrop-blur-sm transition-colors hover:bg-red-600/60 hover:text-white"
            title="Eliminar álbum"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Album info overlay */}
        <div className="absolute bottom-0 left-0 z-30 px-6 pb-5">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setName(album.name);
                    setEditing(false);
                  }
                }}
                className="rounded-lg border border-white/30 bg-black/50 px-3 py-1.5 text-2xl font-semibold text-white backdrop-blur-sm focus:border-white/60 focus:outline-none"
                disabled={saving}
              />
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30 disabled:opacity-40"
              >
                {saving ? "..." : "Guardar"}
              </button>
              <button
                onClick={() => {
                  setName(album.name);
                  setEditing(false);
                }}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/70 backdrop-blur-sm hover:bg-white/20"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-semibold text-white drop-shadow-lg">
                {album.name}
              </h1>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white/80 backdrop-blur-sm">
                  {categoryLabel}
                </span>
                <span className="text-sm text-white/70">
                  {photos.length} foto{photos.length !== 1 ? "s" : ""}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Eliminar álbum</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Se eliminará el álbum <strong>&ldquo;{album.name}&rdquo;</strong>. Las fotos no se borrarán, solo la agrupación.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {deleting && (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo grid */}
      <div className="px-6 pt-6 pb-12">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No hay fotos en esta categoría.
            </p>
          </div>
        ) : (
          <div
            className="flex flex-wrap gap-3 after:content-[''] after:grow-10"
            style={{ "--target-height": "clamp(120px, 15vw, 250px)" } as React.CSSProperties}
          >
            {photos.map((photo, index) => {
              const aspect =
                photo.width && photo.height ? photo.width / photo.height : 3 / 2;
              const ratio =
                photo.width && photo.height
                  ? `${photo.width} / ${photo.height}`
                  : "3 / 2";
              return (
                <div
                  key={photo.id}
                  className="group relative cursor-zoom-in overflow-hidden rounded-lg"
                  style={{
                    flexGrow: aspect,
                    flexBasis: `calc(${aspect} * var(--target-height, 120px))`,
                  }}
                  onClick={() => setLightboxIndex(index)}
                >
                  <div
                    className="relative w-full overflow-hidden bg-muted"
                    style={{ aspectRatio: ratio }}
                  >
                    <img
                      src={`/api/photo/${photo.id}/thumbnail`}
                      alt={photo.originalFilename}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  {/* Score badge */}
                  <div className="absolute right-2 top-2">
                    <LlmScoreBadge photo={photo} />
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={lightboxPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          showDownload
        />
      )}
    </div>
  );
}

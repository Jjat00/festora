"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePhoto } from "@/lib/actions/photo-actions";
import type { Photo, Selection } from "@prisma/client";

type PhotoWithSelection = Photo & { selection: { id: string } | null };

export function PhotoGrid({
  photos,
  projectId,
}: {
  photos: PhotoWithSelection[];
  projectId: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

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
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className={`group relative overflow-hidden rounded-lg border border-[var(--border)] ${photo.selection ? "ring-2 ring-[var(--accent)]" : ""}`}
        >
          <div className="aspect-square bg-[var(--muted)]">
            {photo.thumbnailKey && (
              <img
                src={`/api/photo/${photo.id}/thumbnail`}
                alt={photo.originalFilename}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 p-2 opacity-0 transition-opacity group-hover:opacity-100">
            <p className="truncate text-xs text-white">
              {photo.originalFilename}
            </p>
            <button
              onClick={() => handleDelete(photo.id)}
              disabled={deleting === photo.id}
              className="mt-1 text-xs text-red-400 hover:text-red-300"
            >
              {deleting === photo.id ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
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
  );
}

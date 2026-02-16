"use client";

import { useState, useTransition } from "react";
import { toggleSelection } from "@/lib/actions/selection-actions";

interface GalleryPhoto {
  id: string;
  thumbnailKey: string | null;
  filename: string;
  selected: boolean;
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
      <div className="sticky top-0 z-10 mb-4 flex items-center justify-center bg-[var(--background)] py-3">
        <div className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-[var(--accent-foreground)]">
          {total} favorita{total !== 1 && "s"}
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {photoStates.map((photo) => (
          <button
            key={photo.id}
            onClick={() => handleToggle(photo.id)}
            disabled={isLocked || isPending}
            className={`group relative overflow-hidden rounded-lg border-2 transition-all ${
              photo.selected
                ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
                : "border-transparent hover:border-[var(--border)]"
            } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
          >
            <div className="aspect-square bg-[var(--muted)]">
              {photo.thumbnailKey && (
                <img
                  src={`/api/photo/${photo.id}/thumbnail`}
                  alt={photo.filename}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
            {photo.selected && (
              <div className="absolute right-2 top-2 rounded-full bg-[var(--accent)] p-1.5">
                <svg
                  className="h-4 w-4 text-[var(--accent-foreground)]"
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
          </button>
        ))}
      </div>
    </div>
  );
}

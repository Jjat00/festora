"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface LightboxPhoto {
  id: string;
  filename: string;
  selected?: boolean;
}

interface LightboxProps {
  photos: LightboxPhoto[];
  initialIndex: number;
  onClose: () => void;
  onToggleSelection?: (photoId: string) => void;
  showDownload?: boolean;
}

export function Lightbox({
  photos,
  initialIndex,
  onClose,
  onToggleSelection,
  showDownload,
}: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [loaded, setLoaded] = useState(false);
  const touchStartX = useRef(0);
  const photo = photos[index];

  const goTo = useCallback(
    (dir: -1 | 1) => {
      const next = index + dir;
      if (next >= 0 && next < photos.length) {
        setLoaded(false);
        setIndex(next);
      }
    },
    [index, photos.length]
  );

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goTo(-1);
      else if (e.key === "ArrowRight") goTo(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goTo]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Preload adjacent images
  useEffect(() => {
    for (const offset of [-1, 1]) {
      const i = index + offset;
      if (i >= 0 && i < photos.length) {
        const img = new Image();
        img.src = `/api/photo/${photos[i].id}/view`;
      }
    }
  }, [index, photos]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      goTo(dx > 0 ? -1 : 1);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 text-sm text-white/70">
            {index + 1} / {photos.length}
          </span>
          <span className="truncate text-sm text-white/50">
            {photo.filename}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onToggleSelection && (
            <button
              onClick={() => onToggleSelection(photo.id)}
              className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label={photo.selected ? "Quitar de favoritas" : "Agregar a favoritas"}
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill={photo.selected ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5}>
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
          {showDownload && (
            <a
              href={`/api/photo/${photo.id}/download`}
              download
              className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Descargar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
              </svg>
            </a>
          )}
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Loading spinner */}
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
          </div>
        )}

        <img
          key={photo.id}
          src={`/api/photo/${photo.id}/view`}
          alt={photo.filename}
          className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          draggable={false}
        />

        {/* Navigation arrows */}
        {index > 0 && (
          <button
            onClick={() => goTo(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/70 transition-colors hover:bg-black/60 hover:text-white sm:left-4"
            aria-label="Anterior"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            onClick={() => goTo(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/70 transition-colors hover:bg-black/60 hover:text-white sm:right-4"
            aria-label="Siguiente"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

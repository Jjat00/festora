"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";

export interface LightboxPhoto {
  id: string;
  filename: string;
  selected?: boolean;
  llmScore?: number | null;
  llmSummary?: string | null;
  llmDiscardReason?: string | null;
  llmHighlights?: string[];
  llmIssues?: string[];
  llmComposition?: string | null;
  llmPoseQuality?: string | null;
}

interface LightboxProps {
  photos: LightboxPhoto[];
  initialIndex: number;
  onClose: () => void;
  onToggleSelection?: (photoId: string) => void;
  showDownload?: boolean;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

export function Lightbox({
  photos,
  initialIndex,
  onClose,
  onToggleSelection,
  showDownload,
}: LightboxProps) {
  const [index, setIndex] = useReducer((_: number, n: number) => n, initialIndex);
  const [direction, setDirection] = useReducer((_: number, n: number) => n, 0);
  // Track which photo IDs have fully loaded — persists across navigation
  const loadedIds = useRef(new Set<string>());
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const touchStartX = useRef(0);
  const photo = photos[index];

  function changeIndex(newIndex: number) {
    if (newIndex === index || newIndex < 0 || newIndex >= photos.length) return;
    setDirection(newIndex > index ? 1 : -1);
    setIndex(newIndex);
    // No reset — loadedIds persists so already-seen photos skip the fade
  }

  const goTo = useCallback(
    (dir: -1 | 1) => changeIndex(index + dir),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goTo(-1);
      else if (e.key === "ArrowRight") goTo(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goTo]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Preload ±3 images for smooth navigation
  useEffect(() => {
    for (const offset of [-1, 1, -2, 2, -3, 3]) {
      const i = index + offset;
      if (i >= 0 && i < photos.length) {
        const img = new window.Image();
        img.src = `/api/photo/${photos[i].id}/view`;
      }
    }
  }, [index, photos]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) goTo(dx > 0 ? -1 : 1);
  }

  // Thumbnail strip: show ±7 photos around current
  const start = Math.max(0, index - 7);
  const end = Math.min(photos.length - 1, index + 7);
  const visibleThumbs = photos.slice(start, end + 1);

  return (
    <MotionConfig
      transition={{
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      }}
    >
      <div
        className="fixed inset-0 z-50 flex flex-col bg-black"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between bg-linear-to-b from-black/70 to-transparent px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 text-sm text-white/60">
              {index + 1} / {photos.length}
            </span>
            <span className="truncate text-sm text-white/40">
              {photo.filename}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onToggleSelection && (
              <button
                onClick={() => onToggleSelection(photo.id)}
                className="rounded-full p-2 text-white/70 backdrop-blur-sm transition hover:bg-white/10 hover:text-white"
                aria-label={photo.selected ? "Quitar de favoritas" : "Agregar a favoritas"}
              >
                <svg
                  className="h-5 w-5"
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
            )}
            {showDownload && (
              <a
                href={`/api/photo/${photo.id}/download`}
                download
                className="rounded-full p-2 text-white/70 backdrop-blur-sm transition hover:bg-white/10 hover:text-white"
                aria-label="Descargar"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                </svg>
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-2 text-white/70 backdrop-blur-sm transition hover:bg-white/10 hover:text-white"
              aria-label="Cerrar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Image area */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={photo.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute flex h-full w-full items-center justify-center"
            >
              {/* Thumbnail placeholder — oculto si la full-res ya cargó antes */}
              <img
                src={`/api/photo/${photo.id}/thumbnail`}
                alt=""
                className={`absolute max-h-full max-w-full select-none object-contain transition-opacity duration-200 ${
                  loadedIds.current.has(photo.id) ? "opacity-0" : "opacity-100"
                }`}
                draggable={false}
              />
              {/* Full-res — fade-in solo la primera vez; instantáneo en revisitas */}
              <img
                src={`/api/photo/${photo.id}/view`}
                alt={photo.filename}
                className={`absolute max-h-full max-w-full select-none object-contain transition-opacity duration-500 ${
                  loadedIds.current.has(photo.id) ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => {
                  loadedIds.current.add(photo.id);
                  forceUpdate();
                }}
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          {index > 0 && (
            <button
              onClick={() => goTo(-1)}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white/75 backdrop-blur-lg transition hover:bg-black/75 hover:text-white sm:left-4"
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
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white/75 backdrop-blur-lg transition hover:bg-black/75 hover:text-white sm:right-4"
              aria-label="Siguiente"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* LLM info panel — visible solo cuando hay datos */}
        {(photo.llmSummary || photo.llmDiscardReason) && (
          <div className="shrink-0 border-t border-white/10 bg-black/60 px-4 py-3 backdrop-blur-sm">
            <div className="mx-auto max-w-2xl">
              <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                {/* Score + estado */}
                <div className="flex items-center gap-2">
                  {photo.llmScore != null && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                      (photo.llmDiscardReason)
                        ? "bg-red-500/20 text-red-400"
                        : photo.llmScore >= 7
                          ? "bg-green-500/20 text-green-400"
                          : "bg-white/10 text-white/60"
                    }`}>
                      {photo.llmScore}/10
                    </span>
                  )}
                  {photo.llmDiscardReason && (
                    <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-400">
                      ⚠ Descartar
                    </span>
                  )}
                </div>

                {/* Resumen */}
                {photo.llmSummary && (
                  <p className="flex-1 text-sm text-white/80 italic">&ldquo;{photo.llmSummary}&rdquo;</p>
                )}
              </div>

              {/* Razón de descarte */}
              {photo.llmDiscardReason && (
                <p className="mt-1.5 text-xs text-red-400/80">{photo.llmDiscardReason}</p>
              )}

              {/* Highlights e issues */}
              {((photo.llmHighlights?.length ?? 0) > 0 || (photo.llmIssues?.length ?? 0) > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {photo.llmHighlights?.map((h, i) => (
                    <span key={i} className="rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] text-green-400">
                      ✓ {h}
                    </span>
                  ))}
                  {photo.llmIssues?.map((issue, i) => (
                    <span key={i} className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] text-red-400">
                      ✗ {issue}
                    </span>
                  ))}
                </div>
              )}

              {/* Composición / pose */}
              {(photo.llmComposition || photo.llmPoseQuality) && (
                <div className="mt-1.5 flex flex-wrap gap-3">
                  {photo.llmComposition && (
                    <span className="text-xs text-white/40">
                      Composición: <span className="text-white/60">{photo.llmComposition}</span>
                    </span>
                  )}
                  {photo.llmPoseQuality && (
                    <span className="text-xs text-white/40">
                      Pose: <span className="text-white/60">{photo.llmPoseQuality}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom thumbnail filmstrip */}
        <div className="shrink-0 bg-linear-to-t from-black/70 to-transparent px-4 pb-4 pt-2">
          {/* Like button prominente para clientes */}
          {onToggleSelection && (
            <div className="mb-3 flex justify-center">
              <button
                onClick={() => onToggleSelection(photo.id)}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium backdrop-blur-sm transition-all active:scale-95 ${
                  photo.selected
                    ? "bg-white/25 text-white"
                    : "bg-black/35 text-white/60 hover:bg-black/55 hover:text-white"
                }`}
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
                {photo.selected ? "Quitar de favoritas" : "Agregar a favoritas"}
              </button>
            </div>
          )}
          <div className="mx-auto flex h-14 items-center justify-center gap-1">
            {visibleThumbs.map((p) => {
              const realIndex = photos.indexOf(p);
              const isActive = realIndex === index;
              return (
                <motion.button
                  key={p.id}
                  animate={{ scale: isActive ? 1.2 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  onClick={() => changeIndex(realIndex)}
                  className={`relative h-12 w-16 shrink-0 overflow-hidden rounded focus:outline-none ${
                    isActive ? "z-20 shadow-lg shadow-black/50" : "z-10"
                  }`}
                >
                  <img
                    src={`/api/photo/${p.id}/thumbnail`}
                    alt=""
                    className={`h-full w-full object-cover transition ${
                      isActive
                        ? "brightness-110 ring-2 ring-white"
                        : "brightness-50 contrast-125 hover:brightness-75"
                    }`}
                  />
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { getEmbeddingProgress } from "@/lib/actions/embedding-actions";

interface SearchBarProps<T> {
  projectId: string;
  onResults: (results: T[] | null) => void;
  onSearching: (isSearching: boolean) => void;
  searchFn: (query: string) => Promise<T[]>;
  examples?: string[];
}

const POLL_INITIAL_MS = 8000;
const POLL_MAX_MS = 60000;
const EXAMPLE_ROTATION_MS = 3500;

const DEFAULT_EXAMPLES = [
  "Ej: novia bailando con su padre",
  "Ej: primer beso de los novios",
  "Ej: decoración de mesa con flores",
  "Ej: grupo familiar al aire libre",
  "Ej: niños jugando en la fiesta",
  "Ej: detalles del anillo y ramo",
  "Ej: brindis con copas en alto",
  "Ej: pareja al atardecer",
];

export function SearchBar<T>({
  projectId,
  onResults,
  onSearching,
  searchFn,
  examples = DEFAULT_EXAMPLES,
}: SearchBarProps<T>) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ready = progress !== null && progress.total > 0 && progress.done + progress.failed >= progress.total;
  const hasPhotos = progress !== null && progress.total > 0;

  // Polling de progreso de embeddings — con backoff exponencial y pausa
  // cuando la pestaña está oculta para no saturar el pool de conexiones.
  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let currentInterval = POLL_INITIAL_MS;
    let lastDone = 0;

    async function poll() {
      if (cancelled) return;
      // Pausar si la pestaña no es visible
      if (typeof document !== "undefined" && document.hidden) {
        pollTimer = setTimeout(poll, currentInterval);
        return;
      }

      try {
        const p = await getEmbeddingProgress(projectId);
        if (cancelled) return;
        setProgress(p);

        const finished = p.done + p.failed >= p.total;
        if (finished) return; // Detener polling

        // Backoff: si no hubo progreso, duplicar intervalo (hasta máximo)
        if (p.done === lastDone) {
          currentInterval = Math.min(currentInterval * 2, POLL_MAX_MS);
        } else {
          currentInterval = POLL_INITIAL_MS; // Reset si hubo progreso
          lastDone = p.done;
        }

        pollTimer = setTimeout(poll, currentInterval);
      } catch (err) {
        console.error("[search] Progress poll failed:", err);
        // En error, esperar más tiempo
        pollTimer = setTimeout(poll, POLL_MAX_MS);
      }
    }

    poll();

    // Re-arrancar polling cuando la pestaña vuelve a ser visible
    function onVisible() {
      if (!cancelled && document.visibilityState === "visible") {
        currentInterval = POLL_INITIAL_MS;
        if (pollTimer) clearTimeout(pollTimer);
        poll();
      }
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
  }, [projectId]);

  // Rotar ejemplos del placeholder cuando no hay query escrita
  useEffect(() => {
    if (query || !ready || examples.length <= 1) return;
    const interval = setInterval(() => {
      setExampleIndex((i) => (i + 1) % examples.length);
    }, EXAMPLE_ROTATION_MS);
    return () => clearInterval(interval);
  }, [query, ready, examples.length]);

  const doSearch = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        onResults(null);
        onSearching(false);
        return;
      }

      setLoading(true);
      onSearching(true);
      try {
        const results = await searchFn(trimmed);
        onResults(results);
      } catch (err) {
        console.error("[search] Error:", err);
        onResults([]);
      } finally {
        setLoading(false);
        onSearching(false);
      }
    },
    [searchFn, onResults, onSearching],
  );

  function handleChange(value: string) {
    setQuery(value);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (!value.trim()) {
      onResults(null);
      onSearching(false);
      return;
    }

    timerRef.current = setTimeout(() => doSearch(value), 400);
  }

  function handleClear() {
    setQuery("");
    onResults(null);
    onSearching(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  // No mostrar la barra si no hay fotos
  if (!hasPhotos) return null;

  const disabled = !ready;
  const dynamicPlaceholder = ready
    ? examples[exampleIndex]
    : `Preparando búsqueda… ${progress!.done}/${progress!.total}`;

  return (
    <div className="relative w-full max-w-sm">
      {/* Icono de búsqueda / spinner */}
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {loading || !ready ? (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <svg
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M13 13l4 4" strokeLinecap="round" />
          </svg>
        )}
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={dynamicPlaceholder}
        disabled={disabled}
        title={disabled ? `Procesando ${progress!.done}/${progress!.total} fotos para búsqueda` : undefined}
        className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 disabled:cursor-not-allowed disabled:opacity-60"
      />

      {/* Botón X para limpiar */}
      {query && !disabled && (
        <button
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Limpiar búsqueda"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

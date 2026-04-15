"use client";

import { useState, useRef, useCallback } from "react";

interface SearchBarProps<T> {
  onResults: (results: T[] | null) => void;
  onSearching: (isSearching: boolean) => void;
  searchFn: (query: string) => Promise<T[]>;
  placeholder?: string;
}

export function SearchBar<T>({
  onResults,
  onSearching,
  searchFn,
  placeholder = "Buscar fotos...",
}: SearchBarProps<T>) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <div className="relative w-full max-w-sm">
      {/* Icono de búsqueda / spinner */}
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {loading ? (
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
        placeholder={placeholder}
        className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
      />

      {/* Botón X para limpiar */}
      {query && (
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

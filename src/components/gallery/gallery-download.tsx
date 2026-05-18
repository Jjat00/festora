"use client";

import { useRef, useState } from "react";

type Props = {
  slug: string;
  totalCount: number;
  favoritesCount: number;
};

type DownloadState =
  | { kind: "idle" }
  | { kind: "downloading"; received: number; total: number; type: "all" | "favorites" }
  | { kind: "error"; message: string };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function GalleryDownload({ slug, totalCount, favoritesCount }: Props) {
  const [state, setState] = useState<DownloadState>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  async function startDownload(type: "all" | "favorites") {
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ kind: "downloading", received: 0, total: 0, type });

    try {
      const res = await fetch(`/api/g/${slug}/download?type=${type}`, {
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error("No se pudo iniciar la descarga");
      }

      const totalHeader = res.headers.get("X-Total-Size");
      const total = totalHeader ? Number(totalHeader) : 0;

      const cd = res.headers.get("Content-Disposition") || "";
      const filenameMatch = cd.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? `festora-${type}.zip`;

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        setState({ kind: "downloading", received, total, type });
      }

      const blob = new Blob(chunks as BlobPart[], {
        type: res.headers.get("Content-Type") || "application/zip",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setState({ kind: "idle" });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setState({ kind: "idle" });
        return;
      }
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  if (state.kind === "downloading") {
    const pct = state.total > 0
      ? Math.min(100, Math.round((state.received / state.total) * 100))
      : 0;
    const label = state.type === "favorites" ? "favoritas" : "todas las fotos";

    return (
      <div className="flex w-full max-w-md flex-col gap-2 sm:w-auto sm:min-w-[280px]">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Descargando {label}…</span>
          <button
            type="button"
            onClick={cancel}
            className="font-medium text-foreground/70 hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-150 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
          <span>{pct}%</span>
          <span>
            {formatBytes(state.received)}
            {state.total > 0 && ` / ${formatBytes(state.total)}`}
          </span>
        </div>
      </div>
    );
  }

  const downloadIcon = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => startDownload("all")}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          {downloadIcon}
          Descargar todas
          <span className="text-xs opacity-70">({totalCount})</span>
        </button>
        <button
          type="button"
          onClick={() => startDownload("favorites")}
          disabled={favoritesCount === 0}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background"
          title={favoritesCount === 0 ? "Aún no hay favoritas seleccionadas" : undefined}
        >
          {downloadIcon}
          Solo favoritas
          <span className="text-xs opacity-70">({favoritesCount})</span>
        </button>
      </div>
      {state.kind === "error" && (
        <p className="text-xs text-red-500">{state.message}</p>
      )}
    </div>
  );
}

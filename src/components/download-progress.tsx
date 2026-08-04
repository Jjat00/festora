"use client";

import { useRef, useState } from "react";

export type DownloadState =
  | { kind: "idle" }
  | { kind: "downloading"; received: number; total: number; label: string }
  | { kind: "error"; message: string };

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Descarga un endpoint que hace streaming (ZIP o archivo suelto) leyendo el
 * cuerpo por chunks para poder mostrar progreso real y cancelar a mitad.
 * El endpoint debe exponer X-Total-Size para calcular el porcentaje.
 */
export function useStreamDownload() {
  const [state, setState] = useState<DownloadState>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  async function start(
    url: string,
    { label, fallbackFilename }: { label: string; fallbackFilename: string },
  ) {
    if (abortRef.current) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setState({ kind: "downloading", received: 0, total: 0, label });

    try {
      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok || !res.body) {
        throw new Error("No se pudo iniciar la descarga");
      }

      const totalHeader = res.headers.get("X-Total-Size");
      const total = totalHeader ? Number(totalHeader) : 0;

      const cd = res.headers.get("Content-Disposition") || "";
      const filenameMatch = cd.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? fallbackFilename;

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        setState({ kind: "downloading", received, total, label });
      }

      const blob = new Blob(chunks as BlobPart[], {
        type: res.headers.get("Content-Type") || "application/zip",
      });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);

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

  return { state, start, cancel };
}

export function DownloadProgress({
  received,
  total,
  label,
  onCancel,
  className = "",
}: {
  received: number;
  total: number;
  label: string;
  onCancel: () => void;
  className?: string;
}) {
  const pct =
    total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>Descargando {label}…</span>
        <button
          type="button"
          onClick={onCancel}
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
          {formatBytes(received)}
          {total > 0 && ` / ${formatBytes(total)}`}
        </span>
      </div>
    </div>
  );
}

export const DownloadIcon = (
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

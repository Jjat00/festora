"use client";

import { useRef, useState } from "react";
import { makeZip, predictLength } from "client-zip";

type ManifestFile = {
  id: string;
  name: string;
  size: number;
  url: string;
};

type DownloadManifest = {
  zipName: string;
  totalSize: number;
  files: ManifestFile[];
};

export type DownloadState =
  | { kind: "idle" }
  | { kind: "preparing"; label: string }
  | {
      kind: "downloading";
      label: string;
      received: number;
      total: number;
      part: number;
      parts: number;
    }
  | { kind: "error"; message: string }
  | { kind: "warning"; message: string };

/**
 * Tamaño máximo de cada ZIP cuando hay que pasar por memoria (navegadores sin
 * File System Access API). Con streaming a disco no hay límite.
 */
const MAX_BATCH_BYTES = 500 * 1024 * 1024;

const FETCH_ATTEMPTS = 3;

type WritableFileHandle = {
  createWritable: () => Promise<WritableStream<Uint8Array>>;
};

type SaveFilePicker = (options: {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}) => Promise<WritableFileHandle>;

function getSaveFilePicker(): SaveFilePicker | null {
  if (typeof window === "undefined") return null;
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker })
    .showSaveFilePicker;
  return typeof picker === "function" ? picker.bind(window) : null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(id);
      resolve();
    }, { once: true });
  });
}

async function fetchWithRetry(
  url: string,
  signal: AbortSignal
): Promise<Response | null> {
  for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt++) {
    if (signal.aborted) return null;
    try {
      const res = await fetch(url, { signal });
      if (res.ok && res.body) return res;
    } catch (err) {
      if (signal.aborted) return null;
      if ((err as Error).name === "AbortError") return null;
    }
    await delay(500 * 2 ** attempt, signal);
  }
  return null;
}

/** Reparte los archivos en lotes que quepan en memoria, sin partir ninguno. */
function splitIntoBatches(files: ManifestFile[]): ManifestFile[][] {
  const batches: ManifestFile[][] = [];
  let current: ManifestFile[] = [];
  let currentBytes = 0;

  for (const file of files) {
    if (current.length > 0 && currentBytes + file.size > MAX_BATCH_BYTES) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(file);
    currentBytes += file.size;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

function partName(zipName: string, index: number, total: number): string {
  const base = zipName.replace(/\.zip$/i, "");
  return `${base} (${index} de ${total}).zip`;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revocar de inmediato aborta la descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Descarga un conjunto de fotos como ZIP armado **en el navegador**: pide un
 * manifiesto con URLs prefirmadas y lee cada original directamente de R2, sin
 * que los bytes pasen por el servidor (una función serverless no aguanta 5 GB
 * ni en tiempo ni en transferencia).
 *
 * Cuando el navegador soporta File System Access API el ZIP se escribe a disco
 * a medida que llega, con memoria constante y sin límite de tamaño. Si no, se
 * reparte en varios ZIP que sí quepan en memoria.
 */
export function useZipDownload() {
  const [state, setState] = useState<DownloadState>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  async function start(
    manifestUrl: string,
    { label, suggestedName }: { label: string; suggestedName: string }
  ) {
    if (abortRef.current) return;

    // El diálogo de guardado tiene que abrirse ANTES del primer await: consume
    // la activación del click y el navegador la caduca a los pocos segundos.
    let handle: WritableFileHandle | null = null;
    const picker = getSaveFilePicker();
    if (picker) {
      try {
        handle = await picker({
          suggestedName,
          types: [
            {
              description: "Archivo ZIP",
              accept: { "application/zip": [".zip"] },
            },
          ],
        });
      } catch (err) {
        // El usuario cerró el diálogo: no hay descarga que empezar.
        if ((err as Error).name === "AbortError") return;
        handle = null;
      }
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;
    setState({ kind: "preparing", label });

    try {
      const res = await fetch(manifestUrl, { signal });
      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? "No tienes acceso a estas fotos"
            : res.status === 400
              ? "No hay fotos para descargar"
              : "No se pudo preparar la descarga"
        );
      }

      const manifest: DownloadManifest = await res.json();
      if (!manifest.files.length) {
        throw new Error("No hay fotos para descargar");
      }

      const total = Number(
        predictLength(
          manifest.files.map((f) => ({ name: f.name, size: f.size }))
        )
      );

      let received = 0;
      let lastPublish = 0;
      const failed: string[] = [];

      function publish(part: number, parts: number, force = false) {
        const now = performance.now();
        if (!force && now - lastPublish < 150) return;
        lastPublish = now;
        setState({ kind: "downloading", label, received, total, part, parts });
      }

      // Cuenta los bytes del ZIP conforme salen, para el porcentaje.
      function counter(part: number, parts: number) {
        return new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controllerT) {
            received += chunk.byteLength;
            publish(part, parts);
            controllerT.enqueue(chunk);
          },
        });
      }

      async function* zipInputs(files: ManifestFile[]) {
        for (const file of files) {
          if (signal.aborted) return;
          const response = await fetchWithRetry(file.url, signal);
          if (!response) {
            if (!signal.aborted) failed.push(file.name);
            continue;
          }
          yield { name: file.name, input: response, size: file.size };
        }
      }

      if (handle) {
        // Streaming directo a disco: memoria constante, sin techo de tamaño.
        publish(1, 1, true);
        const writable = await handle.createWritable();
        await makeZip(zipInputs(manifest.files))
          .pipeThrough(counter(1, 1))
          .pipeTo(writable, { signal });
      } else {
        const batches = splitIntoBatches(manifest.files);
        for (let i = 0; i < batches.length; i++) {
          if (signal.aborted) break;
          publish(i + 1, batches.length, true);
          const blob = await new Response(
            makeZip(zipInputs(batches[i])).pipeThrough(
              counter(i + 1, batches.length)
            )
          ).blob();
          if (signal.aborted) break;
          saveBlob(
            blob,
            batches.length === 1
              ? manifest.zipName
              : partName(manifest.zipName, i + 1, batches.length)
          );
          // Descargas consecutivas muy juntas se pierden en algunos navegadores.
          if (i < batches.length - 1) await delay(1000, signal);
        }
      }

      if (signal.aborted) {
        setState({ kind: "idle" });
        return;
      }

      setState(
        failed.length > 0
          ? {
              kind: "warning",
              message: `Se omitieron ${failed.length} foto${
                failed.length !== 1 ? "s" : ""
              } que no se pudieron leer`,
            }
          : { kind: "idle" }
      );
    } catch (err) {
      if ((err as Error).name === "AbortError" || controller.signal.aborted) {
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
  state,
  onCancel,
  className = "",
}: {
  state: Extract<DownloadState, { kind: "preparing" | "downloading" }>;
  onCancel: () => void;
  className?: string;
}) {
  const isPreparing = state.kind === "preparing";
  const pct =
    !isPreparing && state.total > 0
      ? Math.min(100, Math.round((state.received / state.total) * 100))
      : 0;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>
          {isPreparing ? `Preparando ${state.label}…` : `Descargando ${state.label}…`}
          {!isPreparing && state.parts > 1 && (
            <span className="ml-1 opacity-70">
              (parte {state.part} de {state.parts})
            </span>
          )}
        </span>
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
          className={`h-full rounded-full bg-foreground transition-[width] duration-150 ease-out ${
            isPreparing ? "animate-pulse" : ""
          }`}
          style={{ width: isPreparing ? "8%" : `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
        <span>{isPreparing ? "—" : `${pct}%`}</span>
        <span>
          {!isPreparing && (
            <>
              {formatBytes(state.received)}
              {state.total > 0 && ` / ${formatBytes(state.total)}`}
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export function DownloadMessage({ state }: { state: DownloadState }) {
  if (state.kind === "error") {
    return <p className="text-xs text-red-500">{state.message}</p>;
  }
  if (state.kind === "warning") {
    return <p className="text-xs text-yellow-600">{state.message}</p>;
  }
  return null;
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

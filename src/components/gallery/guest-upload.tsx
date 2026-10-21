"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GUEST_MAX_FILE_SIZE,
  GUEST_MAX_FILES_PER_REQUEST,
  GUEST_MAX_THUMBNAIL_SIZE,
  GUEST_NAME_MAX_LENGTH,
  THUMBNAIL_MAX_WIDTH,
} from "@/lib/constants";

// Las fotos de celular pesan 3-8 MB; a 2560 px y calidad 0,85 quedan en ~1 MB
// sin pérdida visible, y la subida aguanta la señal de un salón de eventos.
const MAX_SIDE = 2560;
const CONCURRENCY = 3;
const NAME_KEY = "festora-guest-name";
const KEEP_AS_IS = ["image/jpeg", "image/png", "image/webp"];

type Prepared = {
  original: Blob;
  contentType: string;
  thumbnail: Blob;
  width: number;
  height: number;
  filename: string;
};

type Item = { file: File; status: "pending" | "done" | "failed" };

async function drawScaled(bitmap: ImageBitmap, maxSide: number, type: string, quality: number) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), type, quality)
  );
}

/** Reduce y normaliza: lo que no sea JPEG, PNG o WebP (p. ej. HEIC) sale como JPEG. */
async function prepare(file: File): Promise<Prepared> {
  // imageOrientation respeta el EXIF: sin esto las fotos verticales salen acostadas
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const reencode =
      !KEEP_AS_IS.includes(file.type) ||
      Math.max(bitmap.width, bitmap.height) > MAX_SIDE ||
      file.size > 4 * 1024 * 1024;
    const scale = reencode ? Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height)) : 1;
    const original = reencode ? await drawScaled(bitmap, MAX_SIDE, "image/jpeg", 0.85) : file;
    const thumbnail = await drawScaled(bitmap, THUMBNAIL_MAX_WIDTH, "image/webp", 0.8);
    if (original.size > GUEST_MAX_FILE_SIZE || thumbnail.size > GUEST_MAX_THUMBNAIL_SIZE) {
      throw new Error("too-large");
    }
    return {
      original,
      contentType: reencode ? "image/jpeg" : file.type,
      thumbnail,
      width: Math.round(bitmap.width * scale),
      height: Math.round(bitmap.height * scale),
      filename: reencode ? file.name.replace(/\.[^.]+$/, "") + ".jpg" : file.name,
    };
  } finally {
    bitmap.close();
  }
}

const ERRORS: Record<string, string> = {
  STORAGE_LIMIT_EXCEEDED: "El álbum se quedó sin espacio. Avísale a los anfitriones.",
  RATE_LIMITED: "Se están subiendo muchas fotos a la vez. Intenta de nuevo en unos minutos.",
  GUEST_UPLOADS_CLOSED: "El álbum ya no recibe fotos.",
  GUEST_UPLOADS_DISABLED: "Este álbum no recibe fotos.",
  Unauthorized: "Vuelve a ingresar el PIN de la galería.",
};

class UploadError extends Error {}

export function GuestUpload({ slug, closesAt }: { slug: string; closesAt: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [finished, setFinished] = useState<{ done: number; failed: number } | null>(null);

  useEffect(() => {
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {}
  }, []);

  // Diálogo modal de verdad: foco adentro, Tab no se escapa, Escape cierra y el
  // foco vuelve al botón que lo abrió.
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    nameRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        setOpen(false);
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]):not([type="file"]), [href]'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open, busy]);

  function pick(list: FileList | null) {
    if (!list) return;
    const accepted = Array.from(list).filter((f) => f.type.startsWith("image/") || /\.hei[cf]$/i.test(f.name));
    setItems(accepted.map((file) => ({ file, status: "pending" })));
    setMessage(accepted.length < list.length ? "Solo se pueden subir fotos." : null);
    setFinished(null);
  }

  function reset() {
    setItems([]);
    setMessage(null);
    setFinished(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function mark(file: File, status: Item["status"]) {
    setItems((prev) => prev.map((it) => (it.file === file ? { ...it, status } : it)));
  }

  /** Sube un lote; devuelve los archivos confirmados. Lanza UploadError si el servidor lo rechaza entero. */
  async function uploadBatch(batch: File[]): Promise<File[]> {
    // Preparar de a CONCURRENCY: veinte bitmaps grandes a la vez revientan la memoria de un celular
    const prepared = new Map<File, Prepared>();
    let cursor = 0;
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        while (cursor < batch.length) {
          const file = batch[cursor++];
          try {
            prepared.set(file, await prepare(file));
          } catch {
            mark(file, "failed");
          }
        }
      })
    );
    const ready = batch.filter((f) => prepared.has(f));
    if (ready.length === 0) return [];

    const presign = await fetch(`/api/g/${slug}/guest-upload/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: ready.map((f) => {
          const p = prepared.get(f)!;
          return { contentType: p.contentType, size: p.original.size, thumbnailSize: p.thumbnail.size };
        }),
      }),
    });
    if (!presign.ok) {
      const data = await presign.json().catch(() => ({}));
      throw new UploadError(ERRORS[data.error] ?? "No pudimos subir las fotos. Intenta de nuevo.");
    }
    const { uploads } = (await presign.json()) as {
      uploads: { id: string; uploadUrl: string; thumbnailUploadUrl: string }[];
    };

    const sent: { file: File; id: string }[] = [];
    let next = 0;
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        while (next < ready.length) {
          const i = next++;
          const file = ready[i];
          const p = prepared.get(file)!;
          try {
            const [a, b] = await Promise.all([
              fetch(uploads[i].uploadUrl, { method: "PUT", body: p.original, headers: { "Content-Type": p.contentType } }),
              fetch(uploads[i].thumbnailUploadUrl, { method: "PUT", body: p.thumbnail, headers: { "Content-Type": "image/webp" } }),
            ]);
            if (!a.ok || !b.ok) throw new Error("put");
            sent.push({ file, id: uploads[i].id });
          } catch {
            mark(file, "failed");
          }
        }
      })
    );
    if (sent.length === 0) return [];

    const confirm = await fetch(`/api/g/${slug}/guest-upload/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploaderName: name,
        items: sent.map(({ file, id }) => {
          const p = prepared.get(file)!;
          return { id, originalFilename: p.filename, width: p.width, height: p.height };
        }),
      }),
    });
    if (!confirm.ok) {
      const data = await confirm.json().catch(() => ({}));
      throw new UploadError(ERRORS[data.error] ?? "No pudimos guardar las fotos. Intenta de nuevo.");
    }
    const { confirmed } = (await confirm.json()) as { confirmed: string[] };
    const ok = new Set(confirmed);
    const done: File[] = [];
    for (const { file, id } of sent) {
      if (ok.has(id)) {
        mark(file, "done");
        done.push(file);
      } else {
        mark(file, "failed");
      }
    }
    return done;
  }

  async function upload() {
    // Reintentar solo lo que no se confirmó: lo ya subido no se repite
    const pending = items.filter((it) => it.status !== "done").map((it) => it.file);
    if (pending.length === 0 || busy) return;
    setBusy(true);
    setMessage(null);
    setItems((prev) => prev.map((it) => (it.status === "failed" ? { ...it, status: "pending" } : it)));
    try {
      localStorage.setItem(NAME_KEY, name.trim());
    } catch {}

    const confirmed = new Set<File>();
    try {
      for (let i = 0; i < pending.length; i += GUEST_MAX_FILES_PER_REQUEST) {
        for (const f of await uploadBatch(pending.slice(i, i + GUEST_MAX_FILES_PER_REQUEST))) confirmed.add(f);
      }
      const failed = pending.length - confirmed.size;
      setFinished({ done: confirmed.size + items.filter((it) => it.status === "done").length, failed });
      if (failed === 0) {
        setItems([]);
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch (e) {
      setMessage(e instanceof UploadError ? e.message : "No pudimos subir las fotos. Intenta de nuevo.");
    } finally {
      setBusy(false);
      if (confirmed.size > 0) router.refresh();
    }
  }

  const total = items.length;
  const doneCount = items.filter((it) => it.status === "done").length;
  const failedCount = items.filter((it) => it.status === "failed").length;
  const progress = total ? Math.round(((doneCount + failedCount) / total) * 100) : 0;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="guest-upload-btn inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground shadow-sm transition hover:opacity-90"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
        </svg>
        Subir mis fotos
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-upload-title"
            className="w-full max-w-md rounded-t-2xl bg-background p-6 text-foreground shadow-xl sm:rounded-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="guest-upload-title" className="guest-upload-title text-xl font-semibold">
                  Comparte tus fotos
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Quedan en este álbum para los anfitriones y los demás invitados.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                disabled={busy}
                className="text-2xl leading-none text-muted-foreground hover:text-foreground disabled:opacity-40"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {finished && finished.failed === 0 ? (
              <div className="py-6 text-center" role="status">
                <p className="guest-upload-title text-2xl">¡Gracias!</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {finished.done === 1 ? "Se subió 1 foto." : `Se subieron ${finished.done} fotos.`}
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
                  >
                    Subir más
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
                  >
                    Ver el álbum
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block text-sm">
                  <span className="text-muted-foreground">Tu nombre (opcional)</span>
                  <input
                    ref={nameRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={GUEST_NAME_MAX_LENGTH}
                    disabled={busy}
                    placeholder="Para saber de quién son"
                    autoComplete="name"
                    className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2.5 outline-none focus:border-ring"
                  />
                </label>

                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*,.heic,.heif"
                  multiple
                  className="hidden"
                  onChange={(e) => pick(e.target.files)}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-border px-4 py-6 text-center text-sm transition hover:bg-muted disabled:opacity-60"
                >
                  {total === 0
                    ? "Elegir fotos de tu galería"
                    : total === 1
                      ? "1 foto elegida · cambiar"
                      : `${total} fotos elegidas · cambiar`}
                </button>

                {(busy || doneCount + failedCount > 0) && total > 0 && (
                  <div aria-live="polite">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      {busy ? `Subiendo ${doneCount} de ${total}…` : `${doneCount} de ${total} subidas`}
                      {failedCount > 0 &&
                        ` · ${failedCount} no se ${failedCount === 1 ? "pudo" : "pudieron"} subir (formato no compatible o mala señal)`}
                    </p>
                  </div>
                )}

                {message && (
                  <p className="text-center text-sm text-red-600" role="alert">
                    {message}
                  </p>
                )}

                <button
                  type="button"
                  disabled={busy || total === 0 || doneCount === total}
                  onClick={upload}
                  className="w-full rounded-full bg-accent px-4 py-3 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Subiendo…" : failedCount > 0 || message ? "Reintentar las que faltan" : "Subir fotos"}
                </button>
                {closesAt && (
                  <p className="text-center text-xs text-muted-foreground">
                    El álbum recibe fotos hasta el{" "}
                    {new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "America/Bogota" }).format(
                      new Date(closesAt)
                    )}
                    .
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

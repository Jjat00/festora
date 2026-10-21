"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ALLOWED_IMAGE_TYPES,
  GUEST_MAX_FILE_SIZE,
  GUEST_MAX_FILES_PER_REQUEST,
  GUEST_NAME_MAX_LENGTH,
  THUMBNAIL_MAX_WIDTH,
} from "@/lib/constants";

// Las fotos de celular pesan 3-8 MB; a 2560 px y calidad 0,85 quedan en ~1 MB
// sin pérdida visible, y la subida aguanta la señal de un salón de eventos.
const MAX_SIDE = 2560;
const CONCURRENCY = 3;
const NAME_KEY = "festora-guest-name";

type Prepared = {
  original: Blob;
  contentType: string;
  thumbnail: Blob;
  width: number;
  height: number;
  filename: string;
};

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

async function prepare(file: File): Promise<Prepared> {
  // imageOrientation respeta el EXIF: sin esto las fotos verticales salen acostadas
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const needsResize = Math.max(bitmap.width, bitmap.height) > MAX_SIDE || file.size > 4 * 1024 * 1024;
    const original = needsResize ? await drawScaled(bitmap, MAX_SIDE, "image/jpeg", 0.85) : file;
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    return {
      original,
      contentType: needsResize ? "image/jpeg" : file.type,
      thumbnail: await drawScaled(bitmap, THUMBNAIL_MAX_WIDTH, "image/webp", 0.8),
      width: Math.round(bitmap.width * (needsResize ? scale : 1)),
      height: Math.round(bitmap.height * (needsResize ? scale : 1)),
      filename: needsResize ? file.name.replace(/\.[^.]+$/, "") + ".jpg" : file.name,
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

export function GuestUpload({ slug, closesAt }: { slug: string; closesAt: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [finished, setFinished] = useState<number | null>(null);

  useEffect(() => {
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {}
  }, []);

  function pick(list: FileList | null) {
    if (!list) return;
    const accepted = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles(accepted);
    setMessage(accepted.length < list.length ? "Solo se pueden subir fotos." : null);
    setFinished(null);
  }

  function reset() {
    setFiles([]);
    setDone(0);
    setFailed(0);
    setMessage(null);
    setFinished(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function uploadBatch(batch: File[]) {
    const prepared: (Prepared | null)[] = await Promise.all(
      batch.map((f) => prepare(f).catch(() => null))
    );
    const ok = prepared.filter(
      (p): p is Prepared =>
        p !== null && ALLOWED_IMAGE_TYPES.includes(p.contentType) && p.original.size <= GUEST_MAX_FILE_SIZE
    );
    let lost = batch.length - ok.length;
    if (ok.length === 0) return { uploaded: 0, lost };

    const presign = await fetch(`/api/g/${slug}/guest-upload/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: ok.map((p) => ({ contentType: p.contentType, size: p.original.size })) }),
    });
    if (!presign.ok) {
      const data = await presign.json().catch(() => ({}));
      throw new Error(ERRORS[data.error] ?? "No pudimos subir las fotos. Intenta de nuevo.");
    }
    const { presignedUrls } = (await presign.json()) as {
      presignedUrls: { objectKey: string; thumbnailKey: string; uploadUrl: string; thumbnailUploadUrl: string }[];
    };

    const confirmed: object[] = [];
    let next = 0;
    async function worker() {
      while (next < ok.length) {
        const i = next++;
        const p = ok[i];
        const urls = presignedUrls[i];
        try {
          const [a, b] = await Promise.all([
            fetch(urls.uploadUrl, { method: "PUT", body: p.original, headers: { "Content-Type": p.contentType } }),
            fetch(urls.thumbnailUploadUrl, { method: "PUT", body: p.thumbnail, headers: { "Content-Type": "image/webp" } }),
          ]);
          if (!a.ok || !b.ok) throw new Error("put");
          confirmed.push({
            objectKey: urls.objectKey,
            thumbnailKey: urls.thumbnailKey,
            originalFilename: p.filename,
            width: p.width,
            height: p.height,
          });
          setDone((d) => d + 1);
        } catch {
          lost++;
          setFailed((f) => f + 1);
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    if (confirmed.length === 0) return { uploaded: 0, lost };

    const confirm = await fetch(`/api/g/${slug}/guest-upload/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploaderName: name, uploads: confirmed }),
    });
    if (!confirm.ok) {
      const data = await confirm.json().catch(() => ({}));
      throw new Error(ERRORS[data.error] ?? "No pudimos guardar las fotos. Intenta de nuevo.");
    }
    const { count } = (await confirm.json()) as { count: number };
    return { uploaded: count, lost };
  }

  async function upload() {
    if (files.length === 0 || busy) return;
    setBusy(true);
    setDone(0);
    setFailed(0);
    setMessage(null);
    try {
      localStorage.setItem(NAME_KEY, name.trim());
    } catch {}

    let uploaded = 0;
    try {
      for (let i = 0; i < files.length; i += GUEST_MAX_FILES_PER_REQUEST) {
        const r = await uploadBatch(files.slice(i, i + GUEST_MAX_FILES_PER_REQUEST));
        uploaded += r.uploaded;
      }
      setFinished(uploaded);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No pudimos subir las fotos.");
      if (uploaded > 0) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const total = files.length;
  const progress = total ? Math.round(((done + failed) / total) * 100) : 0;

  return (
    <>
      <button
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
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-upload-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-t-2xl bg-background p-6 text-foreground shadow-xl sm:rounded-2xl">
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
                className="text-2xl leading-none text-muted-foreground hover:text-foreground"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {finished !== null ? (
              <div className="py-6 text-center">
                <p className="guest-upload-title text-2xl">¡Gracias!</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {finished === 1 ? "Se subió 1 foto." : `Se subieron ${finished} fotos.`}
                  {failed > 0 && ` ${failed} no se pudieron subir.`}
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
                  accept="image/*"
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

                {busy && (
                  <div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      Subiendo {done} de {total}…
                    </p>
                  </div>
                )}

                {message && <p className="text-center text-sm text-red-600">{message}</p>}

                <button
                  type="button"
                  disabled={busy || total === 0}
                  onClick={upload}
                  className="w-full rounded-full bg-accent px-4 py-3 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Subiendo…" : "Subir fotos"}
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

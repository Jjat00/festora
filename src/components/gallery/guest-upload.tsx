"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  GUEST_CONFIRM_BATCH,
  GUEST_MAX_FILE_SIZE,
  GUEST_MAX_FILES_PER_REQUEST,
  GUEST_NAME_MAX_LENGTH,
} from "@/lib/constants";

// Las fotos de celular pesan 3-8 MB; a 2560 px y calidad 0,85 quedan en ~1 MB
// sin pérdida visible, y la subida aguanta la señal de un salón de eventos.
const MAX_SIDE = 2560;
const CONCURRENCY = 3;
const NAME_KEY = "festora-guest-name";
const KEEP_AS_IS = ["image/jpeg", "image/png", "image/webp"];

type Prepared = { original: Blob; contentType: string; filename: string };

// `reservation` sobrevive a un fallo de red: el reintento reconfirma esa misma
// reserva antes de pedir otra, para no duplicar la foto si el servidor ya la guardó.
type Item = {
  file: File;
  status: "pending" | "uploaded" | "done" | "failed";
  reservation?: string;
  prepared?: Prepared;
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

/**
 * Reduce y normaliza: lo que no sea JPEG, PNG o WebP (p. ej. HEIC) sale como
 * JPEG. La miniatura y la validación de la imagen las hace el servidor.
 */
async function prepare(file: File): Promise<Prepared> {
  if (KEEP_AS_IS.includes(file.type) && file.size <= 4 * 1024 * 1024) {
    return { original: file, contentType: file.type, filename: file.name };
  }
  // imageOrientation respeta el EXIF: sin esto las fotos verticales salen acostadas
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const original = await drawScaled(bitmap, MAX_SIDE, "image/jpeg", 0.85);
    if (original.size > GUEST_MAX_FILE_SIZE) throw new Error("too-large");
    return { original, contentType: "image/jpeg", filename: file.name.replace(/\.[^.]+$/, "") + ".jpg" };
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

async function runPool<T>(list: T[], worker: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < list.length) await worker(list[next++]);
    })
  );
}

export function GuestUpload({ slug, closesAt }: { slug: string; closesAt: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<Item[]>([]);
  const busyRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [items, setItemsState] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [finished, setFinished] = useState<number | null>(null);
  // El portal sale del contenedor de la galería: copia su tema y sus fuentes
  const [themeAttrs, setThemeAttrs] = useState<{ theme?: string; className: string }>({ className: "" });

  // Estado de cada archivo en un ref (lo leen las tareas en vuelo) y en estado (lo pinta React)
  function setItems(update: (prev: Item[]) => Item[]) {
    itemsRef.current = update(itemsRef.current);
    setItemsState(itemsRef.current);
  }
  function patch(file: File, change: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.file === file ? { ...it, ...change } : it)));
  }

  useEffect(() => {
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {}
  }, []);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  // Diálogo modal: el resto de la página queda inerte, el foco entra y no sale
  // (ni siquiera mientras todo está deshabilitado durante la subida), Escape
  // cierra y al cerrar el foco vuelve al botón que lo abrió.
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const siblings = Array.from(document.body.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && !el.hasAttribute("data-guest-upload-portal")
    );
    siblings.forEach((el) => el.setAttribute("inert", ""));
    nameRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busyRef.current) {
        e.preventDefault();
        setOpen(false);
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]):not([type="file"])'
      );
      if (focusables.length === 0) {
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
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
      siblings.forEach((el) => el.removeAttribute("inert"));
      trigger?.focus();
    };
  }, [open]);

  // Si un control se deshabilita con el foco encima, el foco se queda en el diálogo
  useEffect(() => {
    if (open && busy && dialogRef.current && !dialogRef.current.contains(document.activeElement)) {
      dialogRef.current.focus();
    }
  }, [open, busy]);

  function pick(list: FileList | null) {
    if (!list) return;
    const accepted = Array.from(list).filter((f) => f.type.startsWith("image/") || /\.hei[cf]$/i.test(f.name));
    setItems(() => accepted.map((file) => ({ file, status: "pending" as const })));
    setMessage(accepted.length < list.length ? "Solo se pueden subir fotos." : null);
    setFinished(null);
  }

  function reset() {
    setItems(() => []);
    setMessage(null);
    setFinished(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function postJson(path: string, payload: unknown) {
    const res = await fetch(`/api/g/${slug}/guest-upload/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  /** Confirma las reservas subidas, de a GUEST_CONFIRM_BATCH. */
  async function confirmUploaded() {
    const uploaded = itemsRef.current.filter((it) => it.status === "uploaded" && it.reservation);
    for (let i = 0; i < uploaded.length; i += GUEST_CONFIRM_BATCH) {
      const chunk = uploaded.slice(i, i + GUEST_CONFIRM_BATCH);
      const { ok, data } = await postJson("confirm", {
        uploaderName: name,
        items: chunk.map((it) => ({ id: it.reservation, originalFilename: it.prepared?.filename })),
      });
      const confirmed = new Set<string>(data.confirmed ?? []);
      for (const it of chunk) {
        if (confirmed.has(it.reservation!)) patch(it.file, { status: "done" });
        else if (ok) patch(it.file, { status: "failed", reservation: undefined });
      }
      // Error del servidor: las no confirmadas conservan su reserva para reintentar
      if (!ok) throw new UploadError(ERRORS[data.error] ?? "No pudimos guardar las fotos. Intenta de nuevo.");
    }
  }

  /** Prepara, reserva y sube un lote nuevo. */
  async function uploadBatch(batch: Item[]) {
    await runPool(batch, async (it) => {
      try {
        patch(it.file, { prepared: it.prepared ?? (await prepare(it.file)) });
      } catch {
        patch(it.file, { status: "failed" });
      }
    });
    const ready = itemsRef.current.filter((it) => batch.some((b) => b.file === it.file) && it.prepared && it.status === "pending");
    if (ready.length === 0) return;

    const { ok, data } = await postJson("presign", {
      files: ready.map((it) => ({ contentType: it.prepared!.contentType, size: it.prepared!.original.size })),
    });
    if (!ok) throw new UploadError(ERRORS[data.error] ?? "No pudimos subir las fotos. Intenta de nuevo.");
    const uploads = data.uploads as { id: string; uploadUrl: string }[];

    await runPool(
      ready.map((it, i) => ({ it, up: uploads[i] })),
      async ({ it, up }) => {
        try {
          const res = await fetch(up.uploadUrl, {
            method: "PUT",
            body: it.prepared!.original,
            headers: { "Content-Type": it.prepared!.contentType },
          });
          if (!res.ok) throw new Error("put");
          patch(it.file, { status: "uploaded", reservation: up.id });
        } catch {
          patch(it.file, { status: "failed" });
        }
      }
    );
  }

  async function upload() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      localStorage.setItem(NAME_KEY, name.trim());
    } catch {}

    const before = itemsRef.current.filter((it) => it.status === "done").length;
    try {
      // Primero lo que ya se subió en un intento anterior: reconfirmar no duplica
      await confirmUploaded();
      // Lo que falló sin reserva vuelve a empezar
      setItems((prev) => prev.map((it) => (it.status === "failed" ? { ...it, status: "pending" } : it)));
      const pending = itemsRef.current.filter((it) => it.status === "pending");
      for (let i = 0; i < pending.length; i += GUEST_MAX_FILES_PER_REQUEST) {
        await uploadBatch(pending.slice(i, i + GUEST_MAX_FILES_PER_REQUEST));
        await confirmUploaded();
      }
      const all = itemsRef.current;
      if (all.every((it) => it.status === "done")) {
        setFinished(all.length);
        setItems(() => []);
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch (e) {
      setMessage(e instanceof UploadError ? e.message : "No pudimos subir las fotos. Intenta de nuevo.");
    } finally {
      setBusy(false);
      const after = itemsRef.current.filter((it) => it.status === "done").length;
      if (after > before || itemsRef.current.length === 0) router.refresh();
    }
  }

  const total = items.length;
  const doneCount = items.filter((it) => it.status === "done").length;
  const failedCount = items.filter((it) => it.status === "failed").length;
  const progress = total ? Math.round(((doneCount + failedCount) / total) * 100) : 0;
  const retrying = failedCount > 0 || items.some((it) => it.status === "uploaded") || message !== null;

  const dialog = (
    <div
      data-guest-upload-portal=""
      data-theme={themeAttrs.theme}
      className={`${themeAttrs.className} fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) setOpen(false);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-upload-title"
        aria-busy={busy}
        tabIndex={-1}
        className="w-full max-w-md rounded-t-2xl bg-background p-6 text-foreground shadow-xl outline-none sm:rounded-2xl"
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

        {finished !== null ? (
          <div className="py-6 text-center" role="status">
            <p className="guest-upload-title text-2xl">¡Gracias!</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {finished === 1 ? "Se subió 1 foto." : `Se subieron ${finished} fotos.`}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button type="button" onClick={reset} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">
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
              {total === 0 ? "Elegir fotos de tu galería" : total === 1 ? "1 foto elegida · cambiar" : `${total} fotos elegidas · cambiar`}
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
              {busy ? "Subiendo…" : retrying ? "Reintentar las que faltan" : "Subir fotos"}
            </button>
            {closesAt && (
              <p className="text-center text-xs text-muted-foreground">
                El álbum recibe fotos hasta el{" "}
                {new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "America/Bogota" }).format(new Date(closesAt))}.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          reset();
          const themed = triggerRef.current?.closest<HTMLElement>("[data-theme]");
          setThemeAttrs({
            theme: themed?.dataset.theme,
            className: themed?.dataset.themeFonts ?? "",
          });
          setOpen(true);
        }}
        className="guest-upload-btn inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground shadow-sm transition hover:opacity-90"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
        </svg>
        Subir mis fotos
      </button>
      {open && createPortal(dialog, document.body)}
    </>
  );
}

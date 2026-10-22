import { cookies } from "next/headers";
import sharp from "sharp";
import type { GuestUploadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPinToken } from "@/lib/pin";
import { deleteObjectsReport } from "@/lib/r2";
import {
  DEFAULT_STORAGE_LIMIT,
  GUEST_MAX_PIXELS,
  GUEST_PROCESSING_LEASE_SECONDS,
  GUEST_THUMBNAIL_RESERVE,
  THUMBNAIL_MAX_WIDTH,
} from "@/lib/constants";

type Db = Prisma.TransactionClient | typeof prisma;

export type GuestUploadProject = {
  id: string;
  userId: string;
  storageLimit: number | null;
  userStorageLimit: number;
};

export type Failure = { error: string; status: number };

/**
 * Comprueba que la galería acepta subidas de invitados ahora mismo: existe, no
 * está archivada, tiene el álbum abierto y dentro de plazo, y el visitante pasó
 * el PIN si lo hay. Lo comparten presign y confirm para que no puedan divergir.
 */
export async function getGuestUploadProject(
  slug: string
): Promise<{ project: GuestUploadProject } | Failure> {
  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      userId: true,
      pin: true,
      status: true,
      guestUploads: true,
      guestUploadsUntil: true,
      storageLimit: true,
      user: { select: { storageLimit: true } },
    },
  });

  if (!project || project.status === "ARCHIVED") return { error: "Not found", status: 404 };
  if (!project.guestUploads) return { error: "GUEST_UPLOADS_DISABLED", status: 403 };
  if (project.guestUploadsUntil && project.guestUploadsUntil < new Date()) {
    return { error: "GUEST_UPLOADS_CLOSED", status: 403 };
  }

  if (project.pin) {
    const cookieStore = await cookies();
    const pinCookie = cookieStore.get(`festora_pin_${slug}`);
    if (!pinCookie || !(await verifyPinToken(pinCookie.value, slug))) {
      return { error: "Unauthorized", status: 401 };
    }
  }

  return {
    project: {
      id: project.id,
      userId: project.userId,
      storageLimit: project.storageLimit === null ? null : Number(project.storageLimit),
      userStorageLimit: Number(project.user.storageLimit ?? DEFAULT_STORAGE_LIMIT),
    },
  };
}

/**
 * Serializa dentro de la transacción todo lo que consume la cuota de un dueño
 * (subidas del dashboard, reservas y confirmaciones de invitados), para que dos
 * peticiones simultáneas no lean el mismo uso y se pasen juntas del límite.
 */
export async function lockOwner(tx: Prisma.TransactionClient, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"festora-quota:" + userId}))`;
}

/**
 * Bytes que el bucket puede llegar a guardar por reservas de invitados:
 * - todo staging no limpiado, en cualquier estado (una URL vigente puede volver a escribirlo);
 * - y, para las no confirmadas (PENDING/PROCESSING/REJECTED), la copia final
 *   que pudo publicarse más lo apartado para su miniatura. Una REJECTED sigue
 *   cobrándolo hasta que el barrido verifique el borrado (stagingCleared), porque
 *   su limpieza de finales pudo fallar.
 * `resolvingIds` son reservas que el llamador está convirtiendo en fotos: su
 * parte "futura" se reemplaza por los bytes reales que él suma, pero su staging
 * sigue contando hasta que el barrido lo limpie.
 */
async function guestReservedBytes(db: Db, where: Prisma.GuestUploadWhereInput, resolvingIds: string[]) {
  const live = { ...where, stagingCleared: false };
  const unresolved = {
    ...live,
    status: { not: "CONFIRMED" as GuestUploadStatus },
    ...(resolvingIds.length ? { id: { notIn: resolvingIds } } : {}),
  };
  const [staging, future] = await Promise.all([
    db.guestUpload.aggregate({ where: live, _sum: { size: true } }),
    db.guestUpload.aggregate({ where: unresolved, _sum: { size: true }, _count: true }),
  ]);
  return (staging._sum.size ?? 0) + (future._sum.size ?? 0) + future._count * GUEST_THUMBNAIL_RESERVE;
}

/** Lo que una reserva nueva aparta: staging + copia final + miniatura. */
export function reservationCost(size: number) {
  return 2 * size + GUEST_THUMBNAIL_RESERVE;
}

async function photoBytes(db: Db, where: Prisma.PhotoWhereInput) {
  const agg = await db.photo.aggregate({ where, _sum: { size: true, thumbnailSize: true } });
  return (agg._sum.size ?? 0) + (agg._sum.thumbnailSize ?? 0);
}

/** Uso del dueño: fotos (con miniaturas generadas por el servidor) más reservas de invitados. */
export async function ownerUsage(db: Db, userId: string, resolvingIds: string[] = []) {
  const [photos, reserved] = await Promise.all([
    photoBytes(db, { project: { userId } }),
    guestReservedBytes(db, { ownerId: userId }, resolvingIds),
  ]);
  return photos + reserved;
}

export async function projectUsage(db: Db, projectId: string, resolvingIds: string[] = []) {
  const [photos, reserved] = await Promise.all([
    photoBytes(db, { projectId }),
    guestReservedBytes(db, { projectId }, resolvingIds),
  ]);
  return photos + reserved;
}

/**
 * Limpia reservas vencidas. Primero cambia el estado de forma atómica y solo
 * borra lo que esa transición le dio derecho a borrar:
 * - PENDING vencida -> REJECTED: nadie la reclamó, se borran staging y finales;
 * - PROCESSING con el plazo de proceso agotado -> REJECTED: el confirmador
 *   murió; su finalización exige seguir en PROCESSING, así que ya no registrará;
 * - REJECTED: staging y finales (una rechazada nunca llegó a registrar foto);
 * - CONFIRMED: solo staging (las finales son de una foto).
 * Una reserva se marca limpia únicamente si R2 confirmó el borrado de sus objetos.
 */
export async function cleanupExpiredGuestUploads(
  where: Prisma.GuestUploadWhereInput = {},
  budgetMs = 15_000
): Promise<number> {
  const deadline = Date.now() + budgetMs;
  let cleared = 0;
  while (Date.now() < deadline) {
    const now = new Date();
    const staleProcessing = new Date(now.getTime() - GUEST_PROCESSING_LEASE_SECONDS * 1000);
    const base = { ...where, stagingCleared: false, expiresAt: { lt: now } };

    const abandoned = await prisma.guestUpload.updateManyAndReturn({
      where: {
        ...base,
        OR: [{ status: "PENDING" }, { status: "PROCESSING", processingAt: { lt: staleProcessing } }],
      },
      data: { status: "REJECTED" },
      select: { id: true, stagingKey: true, finalKey: true, finalThumbnailKey: true },
      limit: 200,
    });
    const settled = await prisma.guestUpload.findMany({
      where: { ...base, status: { in: ["CONFIRMED", "REJECTED"] }, id: { notIn: abandoned.map((a) => a.id) } },
      select: { id: true, status: true, stagingKey: true, finalKey: true, finalThumbnailKey: true },
      take: 200,
    });
    if (abandoned.length === 0 && settled.length === 0) break;

    const owned = new Map<string, string[]>();
    for (const a of abandoned) owned.set(a.id, [a.stagingKey, a.finalKey, a.finalThumbnailKey]);
    for (const s of settled) {
      owned.set(s.id, s.status === "REJECTED" ? [s.stagingKey, s.finalKey, s.finalThumbnailKey] : [s.stagingKey]);
    }

    const failed = await deleteObjectsReport([...owned.values()].flat());
    const done = [...owned.entries()].filter(([, keys]) => keys.every((k) => !failed.has(k))).map(([id]) => id);
    if (done.length > 0) {
      await prisma.guestUpload.updateMany({ where: { id: { in: done } }, data: { stagingCleared: true } });
    }
    cleared += done.length;
    // Si todo lo de esta vuelta falló, no insistir en bucle: el siguiente barrido reintenta
    if (done.length === 0 || abandoned.length + settled.length < 200) break;
  }
  return cleared;
}

const SHARP_FORMATS: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };

export type ProcessedImage = {
  thumbnail: Buffer;
  width: number;
  height: number;
};

/**
 * Decodifica de verdad la foto (con límite de píxeles), comprueba que el
 * formato coincida con el reservado y genera la miniatura en el servidor. Si el
 * archivo no es una imagen válida, lanza.
 */
export async function processGuestImage(buffer: Buffer, contentType: string): Promise<ProcessedImage> {
  const image = sharp(buffer, { limitInputPixels: GUEST_MAX_PIXELS, failOn: "error" });
  const meta = await image.metadata();
  if (meta.format !== SHARP_FORMATS[contentType] || !meta.width || !meta.height) {
    throw new Error("format");
  }
  const thumbnail = await sharp(buffer, { limitInputPixels: GUEST_MAX_PIXELS, failOn: "error" })
    .rotate() // aplica la orientación EXIF
    .resize({ width: THUMBNAIL_MAX_WIDTH, height: THUMBNAIL_MAX_WIDTH * 2, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  // Dimensiones ya orientadas, como las ve la galería
  const rotated = (meta.orientation ?? 1) >= 5;
  return {
    thumbnail,
    width: rotated ? meta.height : meta.width,
    height: rotated ? meta.width : meta.height,
  };
}

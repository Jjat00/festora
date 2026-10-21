import { cookies } from "next/headers";
import sharp from "sharp";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPinToken } from "@/lib/pin";
import { deleteObjects } from "@/lib/r2";
import {
  DEFAULT_STORAGE_LIMIT,
  GUEST_MAX_PIXELS,
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
 * Bytes que el bucket puede estar guardando por reservas de invitados: todo
 * staging que aún no se limpió, sin importar el estado (una URL vigente puede
 * volver a escribirlo), más lo apartado para la miniatura de las no resueltas.
 */
async function guestStagingBytes(db: Db, where: Prisma.GuestUploadWhereInput, excludeIds: string[]) {
  const base = { ...where, stagingCleared: false, ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}) };
  const [staging, unresolved] = await Promise.all([
    db.guestUpload.aggregate({ where: base, _sum: { size: true } }),
    db.guestUpload.count({ where: { ...base, status: { in: ["PENDING", "PROCESSING"] } } }),
  ]);
  return (staging._sum.size ?? 0) + unresolved * GUEST_THUMBNAIL_RESERVE;
}

async function photoBytes(db: Db, where: Prisma.PhotoWhereInput) {
  const agg = await db.photo.aggregate({ where, _sum: { size: true, thumbnailSize: true } });
  return (agg._sum.size ?? 0) + (agg._sum.thumbnailSize ?? 0);
}

/**
 * Uso del dueño: fotos (con miniaturas generadas por el servidor) y staging de
 * invitados. `excludeIds` deja fuera reservas que el llamador está convirtiendo
 * en fotos, para no contarlas dos veces.
 */
export async function ownerUsage(db: Db, userId: string, excludeIds: string[] = []) {
  const [photos, staging] = await Promise.all([
    photoBytes(db, { project: { userId } }),
    guestStagingBytes(db, { ownerId: userId }, excludeIds),
  ]);
  return photos + staging;
}

export async function projectUsage(db: Db, projectId: string, excludeIds: string[] = []) {
  const [photos, staging] = await Promise.all([
    photoBytes(db, { projectId }),
    guestStagingBytes(db, { projectId }, excludeIds),
  ]);
  return photos + staging;
}

/**
 * Limpia staging de reservas vencidas. Pasado `expiresAt` la URL firmada ya no
 * sirve (vence antes), así que nada vuelve a escribir esas claves. Una reserva
 * que quedó en PROCESSING (proceso caído) también se lleva su copia final si
 * nadie llegó a registrarla como foto. Pagina hasta agotar el presupuesto.
 */
export async function cleanupExpiredGuestUploads(
  where: Prisma.GuestUploadWhereInput = {},
  budgetMs = 15_000
): Promise<number> {
  const deadline = Date.now() + budgetMs;
  let cleared = 0;
  while (Date.now() < deadline) {
    const expired = await prisma.guestUpload.findMany({
      where: { ...where, stagingCleared: false, expiresAt: { lt: new Date() } },
      select: { id: true, status: true, stagingKey: true, finalKey: true, finalThumbnailKey: true },
      take: 200,
    });
    if (expired.length === 0) break;

    const unconfirmed = expired.filter((u) => u.status !== "CONFIRMED");
    const registered = new Set(
      (
        await prisma.photo.findMany({
          where: { objectKey: { in: unconfirmed.map((u) => u.finalKey) } },
          select: { objectKey: true },
        })
      ).map((p) => p.objectKey)
    );
    const keys = expired.flatMap((u) =>
      u.status !== "CONFIRMED" && !registered.has(u.finalKey)
        ? [u.stagingKey, u.finalKey, u.finalThumbnailKey]
        : [u.stagingKey]
    );
    await deleteObjects(keys);
    await prisma.guestUpload.updateMany({
      where: { id: { in: expired.map((u) => u.id) }, status: { in: ["PENDING", "PROCESSING"] } },
      data: { status: "REJECTED" },
    });
    await prisma.guestUpload.updateMany({
      where: { id: { in: expired.map((u) => u.id) } },
      data: { stagingCleared: true },
    });
    cleared += expired.length;
    if (expired.length < 200) break;
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

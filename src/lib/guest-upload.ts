import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPinToken } from "@/lib/pin";
import { deleteObjects, getGuestStagingKeys } from "@/lib/r2";
import { DEFAULT_STORAGE_LIMIT } from "@/lib/constants";

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
 * (reservas y confirmaciones de invitados), para que dos peticiones simultáneas
 * no lean el mismo uso y se pasen juntas del límite.
 */
export async function lockOwner(tx: Prisma.TransactionClient, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"festora-quota:" + userId}))`;
}

const pendingWhere = { confirmedAt: null, stagingCleared: false } as const;

/** Bytes de reservas de invitados que todavía ocupan (o pueden ocupar) el bucket. */
export async function pendingGuestBytes(
  db: Prisma.TransactionClient | typeof prisma,
  where: Prisma.GuestUploadWhereInput
): Promise<number> {
  const agg = await db.guestUpload.aggregate({
    where: { ...pendingWhere, ...where },
    _sum: { size: true, thumbnailSize: true },
  });
  return (agg._sum.size ?? 0) + (agg._sum.thumbnailSize ?? 0);
}

/** Uso del dueño contando fotos registradas y reservas de invitados en curso. */
export async function ownerUsage(db: Prisma.TransactionClient | typeof prisma, userId: string) {
  const [photos, pending] = await Promise.all([
    db.photo.aggregate({ where: { project: { userId } }, _sum: { size: true } }),
    pendingGuestBytes(db, { project: { userId } }),
  ]);
  return (photos._sum.size ?? 0) + pending;
}

export async function projectUsage(db: Prisma.TransactionClient | typeof prisma, projectId: string) {
  const [photos, pending] = await Promise.all([
    db.photo.aggregate({ where: { projectId }, _sum: { size: true } }),
    pendingGuestBytes(db, { projectId }),
  ]);
  return (photos._sum.size ?? 0) + pending;
}

/**
 * Borra de staging las reservas vencidas (confirmadas o no) y deja de contarlas.
 * Pasado el vencimiento la URL de subida ya no sirve, así que nada puede volver
 * a escribir en esas claves después de esta limpieza.
 */
export async function cleanupExpiredGuestUploads(where: Prisma.GuestUploadWhereInput = {}, take = 100) {
  const expired = await prisma.guestUpload.findMany({
    where: { ...where, stagingCleared: false, expiresAt: { lt: new Date() } },
    select: { id: true, extension: true, project: { select: { id: true, userId: true } } },
    take,
  });
  if (expired.length === 0) return 0;

  const keys = expired.flatMap((u) => {
    const k = getGuestStagingKeys(u.project.userId, u.project.id, u.id, u.extension);
    return [k.original, k.thumbnail];
  });
  for (let i = 0; i < keys.length; i += 1000) await deleteObjects(keys.slice(i, i + 1000));
  await prisma.guestUpload.updateMany({
    where: { id: { in: expired.map((u) => u.id) } },
    data: { stagingCleared: true },
  });
  return expired.length;
}

// Firmas de formato: el MIME que declara el navegador no prueba nada.
export function matchesImageType(bytes: Uint8Array | null, contentType: string): boolean {
  if (!bytes || bytes.length < 12) return false;
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  switch (contentType) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return bytes[0] === 0x89 && ascii(1, 4) === "PNG";
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    default:
      return false;
  }
}

/** Dimensión razonable de una foto, o null si viene vacía o absurda. */
export function cleanDimension(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 20000 ? value : null;
}

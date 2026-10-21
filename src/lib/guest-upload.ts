import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPinToken } from "@/lib/pin";
import { DEFAULT_STORAGE_LIMIT, GUEST_HOURLY_LIMIT } from "@/lib/constants";

export type GuestUploadProject = {
  id: string;
  userId: string;
  storageLimit: number | null;
  userStorageLimit: number;
};

type Failure = { error: string; status: number };

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

/** Rechaza la subida si rebasa el límite del usuario dueño o el tope propio del proyecto. */
export async function checkGuestStorage(
  project: GuestUploadProject,
  uploadSize: number
): Promise<Failure | null> {
  const [userUsage, projectUsage] = await Promise.all([
    prisma.photo.aggregate({ where: { project: { userId: project.userId } }, _sum: { size: true } }),
    prisma.photo.aggregate({ where: { projectId: project.id }, _sum: { size: true } }),
  ]);
  const usedByUser = userUsage._sum.size ?? 0;
  const usedByProject = projectUsage._sum.size ?? 0;

  if (usedByUser + uploadSize > project.userStorageLimit) {
    return { error: "STORAGE_LIMIT_EXCEEDED", status: 403 };
  }
  if (project.storageLimit !== null && usedByProject + uploadSize > project.storageLimit) {
    return { error: "STORAGE_LIMIT_EXCEEDED", status: 403 };
  }
  return null;
}

/** Freno contra abuso: cuántas fotos de invitados entraron a este proyecto en la última hora. */
export async function checkGuestRate(projectId: string, incoming: number): Promise<Failure | null> {
  const recent = await prisma.photo.count({
    where: {
      projectId,
      source: "GUEST",
      createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recent + incoming > GUEST_HOURLY_LIMIT) return { error: "RATE_LIMITED", status: 429 };
  return null;
}

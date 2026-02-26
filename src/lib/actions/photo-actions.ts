"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteObject, deleteObjects } from "@/lib/r2";
import { DEFAULT_STORAGE_LIMIT } from "@/lib/constants";
import type { ConfirmUploadInput } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { dispatchPhotoAnalysis, generateAlbumSuggestions } from "@/lib/actions/ai-actions";

async function getAuthenticatedUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function confirmUpload(
  projectId: string,
  uploads: ConfirmUploadInput[]
) {
  const userId = await getAuthenticatedUserId();

  // Verify project ownership
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found");

  // Double-check storage limit (race condition protection)
  const [user, storageAggregate] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { storageLimit: true },
    }),
    prisma.photo.aggregate({
      where: { project: { userId } },
      _sum: { size: true },
    }),
  ]);

  const storageLimit = Number(user?.storageLimit ?? DEFAULT_STORAGE_LIMIT);
  const currentUsage = storageAggregate._sum.size ?? 0;
  const uploadSize = uploads.reduce((sum, u) => sum + u.size, 0);

  if (currentUsage + uploadSize > storageLimit) {
    throw new Error("STORAGE_LIMIT_EXCEEDED");
  }

  // Get current max order
  const lastPhoto = await prisma.photo.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const startOrder = (lastPhoto?.order ?? -1) + 1;

  const photos = await prisma.photo.createManyAndReturn({
    data: uploads.map((upload, index) => ({
      projectId,
      objectKey: upload.objectKey,
      thumbnailKey: upload.thumbnailKey,
      originalFilename: upload.originalFilename,
      order: startOrder + index,
      width: upload.width,
      height: upload.height,
      size: upload.size,
    })),
  });

  revalidatePath(`/projects/${projectId}/photos`);

  return { photos };
}

export async function deletePhoto(photoId: string) {
  const userId = await getAuthenticatedUserId();

  const photo = await prisma.photo.findFirst({
    where: { id: photoId, project: { userId } },
    select: { id: true, projectId: true, objectKey: true, thumbnailKey: true },
  });
  if (!photo) throw new Error("Photo not found");

  await prisma.photo.delete({ where: { id: photoId } });

  // Delete from R2
  await deleteObject(photo.objectKey);
  if (photo.thumbnailKey) {
    await deleteObject(photo.thumbnailKey);
  }

  revalidatePath(`/projects/${photo.projectId}/photos`);
}

export async function deletePhotos(photoIds: string[], projectId: string) {
  const userId = await getAuthenticatedUserId();

  const photos = await prisma.photo.findMany({
    where: { id: { in: photoIds }, project: { userId, id: projectId } },
    select: { id: true, objectKey: true, thumbnailKey: true },
  });
  if (photos.length === 0) return;

  await prisma.photo.deleteMany({ where: { id: { in: photos.map((p) => p.id) } } });

  const keys = photos.flatMap((p) =>
    p.thumbnailKey ? [p.objectKey, p.thumbnailKey] : [p.objectKey]
  );
  await deleteObjects(keys);

  revalidatePath(`/projects/${projectId}/photos`);
}

export async function reorderPhotos(projectId: string, photoIds: string[]) {
  const userId = await getAuthenticatedUserId();

  // Verify project ownership
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found");

  await prisma.$transaction(
    photoIds.map((id, index) =>
      prisma.photo.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  revalidatePath(`/projects/${projectId}/photos`);
}

/**
 * Dispara el análisis IA de las fotos pendientes de un proyecto.
 * Llamado manualmente desde el dashboard (botón con confirmación).
 * Solo procesa fotos con aiStatus PENDING o FAILED.
 */
export async function triggerProjectAnalysis(projectId: string): Promise<{ queued: number }> {
  const userId = await getAuthenticatedUserId();

  const project = await prisma.project.findUnique({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found");

  const photos = await prisma.photo.findMany({
    where: { projectId, aiStatus: { in: ["PENDING", "FAILED"] } },
    select: { id: true, objectKey: true, thumbnailKey: true },
  });

  if (photos.length === 0) return { queued: 0 };

  after(() => dispatchPhotoAnalysis(photos));

  revalidatePath(`/projects/${projectId}/photos`);
  return { queued: photos.length };
}

/**
 * Resetea fotos QUEUED atascadas (el proceso after() murió) y relanza el análisis.
 * Marca las QUEUED como FAILED, luego triggerProjectAnalysis las recoge.
 */
export async function restartStalledAnalysis(projectId: string): Promise<{ queued: number }> {
  const userId = await getAuthenticatedUserId();

  const project = await prisma.project.findUnique({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found");

  // Reset QUEUED → FAILED so triggerProjectAnalysis picks them up
  await prisma.photo.updateMany({
    where: { projectId, aiStatus: "QUEUED" },
    data: { aiStatus: "FAILED" },
  });

  // Now trigger normally (picks up PENDING + FAILED)
  const photos = await prisma.photo.findMany({
    where: { projectId, aiStatus: { in: ["PENDING", "FAILED"] } },
    select: { id: true, objectKey: true, thumbnailKey: true },
  });

  if (photos.length === 0) return { queued: 0 };

  after(() => dispatchPhotoAnalysis(photos));

  revalidatePath(`/projects/${projectId}/photos`);
  return { queued: photos.length };
}

/**
 * Genera álbumes sugeridos a partir de las categorías de IA.
 * Requiere que las fotos ya hayan sido analizadas.
 */
export async function triggerAlbumGeneration(projectId: string): Promise<{ albums: number }> {
  const userId = await getAuthenticatedUserId();

  const project = await prisma.project.findUnique({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found");

  const result = await generateAlbumSuggestions(projectId);

  revalidatePath(`/projects/${projectId}/albums`);
  return result;
}

export async function getProjectPhotos(projectId: string) {
  const userId = await getAuthenticatedUserId();

  const project = await prisma.project.findUnique({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found");

  return prisma.photo.findMany({
    where: { projectId },
    include: { selection: { select: { id: true } } },
    orderBy: { order: "asc" },
  });
}

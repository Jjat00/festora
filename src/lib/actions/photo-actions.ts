"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteObject, deleteObjects } from "@/lib/r2";
import { DEFAULT_STORAGE_LIMIT } from "@/lib/constants";
import type { ConfirmUploadInput } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { dispatchPhotoAnalysis, dispatchLlmAnalysis } from "@/lib/vision/analysis-actions";

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

export type LlmModel =
  | "anthropic/claude-sonnet-4-6"
  | "openai/gpt-4.1"
  | "gemini/gemini-2.0-flash";

export type LlmPhotoFilter = "highlighted" | "manual" | "all";

/**
 * Dispara el análisis LLM de un conjunto de fotos.
 * - "highlighted": solo fotos con compositeScore >= 65
 * - "manual": photoIds explícitos
 * - "all": todas las fotos del proyecto
 */
export async function triggerLlmAnalysis(
  projectId: string,
  filter: LlmPhotoFilter,
  model: LlmModel,
  photoIds?: string[]
): Promise<{ queued: number }> {
  const userId = await getAuthenticatedUserId();

  const project = await prisma.project.findUnique({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found");

  let photos: { id: string; objectKey: string; thumbnailKey: string | null }[];

  if (filter === "manual") {
    if (!photoIds || photoIds.length === 0) return { queued: 0 };
    photos = await prisma.photo.findMany({
      where: { id: { in: photoIds }, projectId },
      select: { id: true, objectKey: true, thumbnailKey: true },
    });
  } else if (filter === "highlighted") {
    photos = await prisma.photo.findMany({
      where: { projectId, compositeScore: { gte: 65 } },
      select: { id: true, objectKey: true, thumbnailKey: true },
    });
  } else {
    photos = await prisma.photo.findMany({
      where: { projectId },
      select: { id: true, objectKey: true, thumbnailKey: true },
    });
  }

  if (photos.length === 0) return { queued: 0 };

  after(() => dispatchLlmAnalysis(photos, model));

  revalidatePath(`/projects/${projectId}/photos`);
  return { queued: photos.length };
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

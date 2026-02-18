"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/r2";
import { DEFAULT_STORAGE_LIMIT } from "@/lib/constants";
import type { ConfirmUploadInput } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { dispatchPhotoAnalysis } from "@/lib/vision/analysis-actions";

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

  // Fire-and-forget: iniciar análisis AI sin bloquear la respuesta al cliente.
  void dispatchPhotoAnalysis(
    photos.map((p) => ({ id: p.id, objectKey: p.objectKey, thumbnailKey: p.thumbnailKey }))
  );

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

"use server";

import { prisma } from "@/lib/prisma";

export async function toggleSelection(projectId: string, photoId: string) {
  // Verify the project is active and the photo belongs to it
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, status: true, selectionDeadline: true },
  });
  if (!project) throw new Error("Project not found");
  if (project.status === "LOCKED" || project.status === "ARCHIVED") {
    throw new Error("Selections are locked");
  }
  if (project.selectionDeadline && project.selectionDeadline < new Date()) {
    throw new Error("Selection deadline has passed");
  }

  const photo = await prisma.photo.findUnique({
    where: { id: photoId, projectId },
    select: { id: true },
  });
  if (!photo) throw new Error("Photo not found");

  // Toggle: if selection exists, delete it; otherwise create it
  const existing = await prisma.selection.findUnique({
    where: { photoId },
  });

  if (existing) {
    await prisma.selection.delete({ where: { id: existing.id } });
  } else {
    await prisma.selection.create({
      data: { projectId, photoId },
    });
  }

  const totalSelected = await prisma.selection.count({
    where: { projectId },
  });

  return { selected: !existing, totalSelected };
}

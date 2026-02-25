"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function getAuthenticatedUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function updateAlbumName(albumId: string, name: string) {
  const userId = await getAuthenticatedUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("El nombre no puede estar vacío");

  const album = await prisma.albumSuggestion.findUnique({
    where: { id: albumId },
    select: { projectId: true },
  });
  if (!album) throw new Error("Album not found");

  // Verify ownership
  const project = await prisma.project.findUnique({
    where: { id: album.projectId, userId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found");

  await prisma.albumSuggestion.update({
    where: { id: albumId },
    data: { name: trimmed },
  });

  revalidatePath(`/projects/${album.projectId}/albums`);
}

export async function deleteAlbum(albumId: string) {
  const userId = await getAuthenticatedUserId();

  const album = await prisma.albumSuggestion.findUnique({
    where: { id: albumId },
    select: { projectId: true },
  });
  if (!album) throw new Error("Album not found");

  // Verify ownership
  const project = await prisma.project.findUnique({
    where: { id: album.projectId, userId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found");

  await prisma.albumSuggestion.delete({
    where: { id: albumId },
  });

  revalidatePath(`/projects/${album.projectId}/albums`);
}

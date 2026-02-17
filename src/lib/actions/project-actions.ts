"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/slug";
import { hashPin } from "@/lib/pin";
import { deleteObjects } from "@/lib/r2";
import type { CreateProjectInput, UpdateProjectInput } from "@/lib/types";
import { revalidatePath } from "next/cache";

async function getAuthenticatedUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function createProject(input: CreateProjectInput) {
  const userId = await getAuthenticatedUserId();
  const slug = await generateUniqueSlug();
  const pin = input.pin ? await hashPin(input.pin) : null;

  const project = await prisma.project.create({
    data: {
      userId,
      name: input.name,
      clientName: input.clientName,
      type: input.type,
      date: input.date,
      slug,
      pin,
      selectionDeadline: input.selectionDeadline ?? null,
    },
  });

  revalidatePath("/dashboard");
  return { project, slug };
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput
) {
  const userId = await getAuthenticatedUserId();

  const data: Record<string, unknown> = { ...input };
  if (input.pin !== undefined) {
    data.pin = input.pin ? await hashPin(input.pin) : null;
  }

  const project = await prisma.project.update({
    where: { id: projectId, userId },
    data,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/projects/${projectId}`);
  return { project };
}

export async function deleteProject(projectId: string) {
  const userId = await getAuthenticatedUserId();

  // Get all photo keys to delete from R2
  const photos = await prisma.photo.findMany({
    where: { projectId, project: { userId } },
    select: { objectKey: true, thumbnailKey: true },
  });

  const keysToDelete = photos.flatMap((p) =>
    [p.objectKey, p.thumbnailKey].filter(Boolean) as string[]
  );

  await prisma.project.delete({
    where: { id: projectId, userId },
  });

  if (keysToDelete.length > 0) {
    await deleteObjects(keysToDelete);
  }

  revalidatePath("/dashboard");
}

export async function lockProject(projectId: string) {
  const userId = await getAuthenticatedUserId();

  const project = await prisma.project.update({
    where: { id: projectId, userId },
    data: { status: "LOCKED" },
  });

  revalidatePath(`/projects/${projectId}`);
  return { project };
}

export async function unlockProject(projectId: string) {
  const userId = await getAuthenticatedUserId();

  const project = await prisma.project.update({
    where: { id: projectId, userId },
    data: { status: "ACTIVE" },
  });

  revalidatePath(`/projects/${projectId}`);
  return { project };
}

export async function getProject(projectId: string) {
  const userId = await getAuthenticatedUserId();

  return prisma.project.findUnique({
    where: { id: projectId, userId },
    include: {
      _count: { select: { photos: true, selections: true } },
    },
  });
}

export async function getUserProjects() {
  const userId = await getAuthenticatedUserId();

  return prisma.project.findMany({
    where: { userId },
    include: {
      _count: { select: { photos: true, selections: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

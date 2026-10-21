"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/slug";
import { hashPin } from "@/lib/pin";
import { deleteObjects } from "@/lib/r2";
import type { CreateProjectInput, UpdateProjectInput } from "@/lib/types";
import type { Prisma } from "@prisma/client";
import { toGalleryTheme } from "@/lib/themes";
import { GUEST_MAX_PROJECT_STORAGE_GB, GUEST_MIN_PROJECT_STORAGE_GB } from "@/lib/constants";
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

  // Lista explícita: un Server Action recibe lo que mande el navegador, y
  // esparcir input dejaba escribir cualquier columna del proyecto.
  const data: Prisma.ProjectUpdateInput = {
    name: input.name,
    clientName: input.clientName,
    type: input.type,
    date: input.date,
    slug: input.slug,
    coverKey: input.coverKey,
    coverPhrase: input.coverPhrase,
    status: input.status,
    selectionDeadline: input.selectionDeadline,
    guestUploads: input.guestUploads,
    guestUploadsUntil: input.guestUploadsUntil,
    theme: input.theme === undefined ? undefined : toGalleryTheme(input.theme),
  };
  if (input.pin !== undefined) {
    data.pin = input.pin ? await hashPin(input.pin) : null;
  }
  if (input.storageLimitGb !== undefined) {
    const gb = input.storageLimitGb;
    if (gb === null) {
      data.storageLimit = null;
    } else if (typeof gb === "number" && Number.isFinite(gb) && gb >= GUEST_MIN_PROJECT_STORAGE_GB && gb <= GUEST_MAX_PROJECT_STORAGE_GB) {
      data.storageLimit = BigInt(Math.round(gb * 1024 ** 3));
    } else {
      throw new Error(`El tope debe ser un número entre 0,1 y ${GUEST_MAX_PROJECT_STORAGE_GB} GB`);
    }
  }
  if (input.guestUploads !== undefined && typeof input.guestUploads !== "boolean") {
    throw new Error("Valor inválido para el álbum colaborativo");
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

  // Las reservas sobreviven al proyecto (projectId pasa a null) con sus claves:
  // el barrido vuelve a limpiar staging cuando venzan sus URLs de subida.
  const staging = await prisma.guestUpload.findMany({
    where: { projectId, project: { userId }, stagingCleared: false },
    select: { stagingKey: true },
  });

  const keysToDelete = [
    ...photos.flatMap((p) => [p.objectKey, p.thumbnailKey].filter(Boolean) as string[]),
    ...staging.map((s) => s.stagingKey),
  ];

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

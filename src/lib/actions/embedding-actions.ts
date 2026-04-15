"use server";

import { auth } from "@/auth";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignedReadUrl } from "@/lib/r2";
import { generatePhotoDescription } from "@/lib/ai/photo-description";
import { generatePhotoEmbedding } from "@/lib/ai/embeddings";

const BATCH_SIZE = 5;
const MAX_CONCURRENT = 3;

interface PhotoToEmbed {
  id: string;
  objectKey: string;
  thumbnailKey: string | null;
}

/**
 * Procesa una sola foto: descripción → embedding → DB.
 * Maneja errores por foto sin afectar al resto del batch.
 */
async function processPhoto(photo: PhotoToEmbed): Promise<boolean> {
  try {
    // Descargar thumbnail
    const url = await getSignedReadUrl(photo.thumbnailKey ?? photo.objectKey);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const imageBase64 = buffer.toString("base64");
    const mimeType = photo.thumbnailKey ? "image/webp" : "image/jpeg";

    // Generar descripción + embedding
    const description = await generatePhotoDescription(imageBase64, mimeType);
    const embedding = await generatePhotoEmbedding(description, imageBase64, mimeType);

    // Persistir
    const vectorStr = `[${embedding.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE "Photo"
       SET embedding = $1::vector,
           "embeddingStatus" = 'DONE'::"EmbeddingStatus",
           "embeddingDescription" = $2
       WHERE id = $3`,
      vectorStr,
      description,
      photo.id,
    );

    return true;
  } catch (err) {
    console.error(`[embedding] Photo ${photo.id} failed:`, err);
    await prisma.photo.update({
      where: { id: photo.id },
      data: { embeddingStatus: "FAILED" },
    });
    return false;
  }
}

/**
 * Genera embeddings en background para un set de fotos.
 * Procesa en batches con concurrencia limitada para no saturar la API.
 * Independiente del análisis AI: usa su propio LLM ligero para descripción.
 */
export async function dispatchEmbeddingGeneration(
  photos: PhotoToEmbed[],
): Promise<void> {
  if (photos.length === 0) return;

  // Marcar todas como QUEUED de inmediato — evita que polling re-dispare
  await prisma.photo.updateMany({
    where: { id: { in: photos.map((p) => p.id) } },
    data: { embeddingStatus: "QUEUED" },
  });

  console.log(`[embedding] Starting generation for ${photos.length} photos`);
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < photos.length; i += BATCH_SIZE) {
    const batch = photos.slice(i, i + BATCH_SIZE);

    // Procesar batch con concurrencia limitada
    for (let j = 0; j < batch.length; j += MAX_CONCURRENT) {
      const chunk = batch.slice(j, j + MAX_CONCURRENT);
      const results = await Promise.all(chunk.map(processPhoto));
      for (const ok of results) {
        if (ok) succeeded++;
        else failed++;
      }
    }
  }

  console.log(`[embedding] Done: ${succeeded} succeeded, ${failed} failed`);
}

/**
 * Backfill: encuentra fotos sin embedding y las procesa.
 * Útil para fotos subidas antes de habilitar la feature.
 */
export async function backfillProjectEmbeddings(
  projectId: string,
): Promise<{ queued: number }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const project = await prisma.project.findUnique({
    where: { id: projectId, userId: session.user.id },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found");

  const photos = await prisma.photo.findMany({
    where: {
      projectId,
      embeddingStatus: { in: ["PENDING", "FAILED"] },
    },
    select: { id: true, objectKey: true, thumbnailKey: true },
  });

  if (photos.length === 0) return { queued: 0 };

  // Fire-and-forget: el cliente no espera el resultado
  void dispatchEmbeddingGeneration(photos);

  return { queued: photos.length };
}

/**
 * Retorna el progreso de generación de embeddings de un proyecto.
 * Auto-dispara en background las fotos PENDING (proyectos viejos o uploads
 * cuyo dispatch original murió). El cliente solo polea, no necesita botón.
 */
export async function getEmbeddingProgress(
  projectId: string,
): Promise<{ done: number; total: number; failed: number }> {
  const groups = await prisma.photo.groupBy({
    by: ["embeddingStatus"],
    where: { projectId },
    _count: true,
  });

  let done = 0;
  let failed = 0;
  let total = 0;
  for (const g of groups) {
    total += g._count;
    if (g.embeddingStatus === "DONE") done = g._count;
    if (g.embeddingStatus === "FAILED") failed = g._count;
  }

  // Auto-dispatch: si hay fotos PENDING (nunca arrancadas), las disparamos
  // en background. QUEUED ya están en proceso, así que no las tocamos.
  const pending = await prisma.photo.findMany({
    where: { projectId, embeddingStatus: "PENDING" },
    select: { id: true, objectKey: true, thumbnailKey: true },
  });

  if (pending.length > 0) {
    after(() => dispatchEmbeddingGeneration(pending));
  }

  return { done, total, failed };
}

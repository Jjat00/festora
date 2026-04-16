"use server";

import { prisma } from "@/lib/prisma";
import { getSignedReadUrl } from "@/lib/r2";
import { generatePhotoDescription } from "@/lib/ai/photo-description";
import { generatePhotoEmbedding } from "@/lib/ai/embeddings";

const STALE_QUEUED_MINUTES = 3;
const CRON_BATCH_SIZE = 3;

interface PhotoToEmbed {
  id: string;
  objectKey: string;
  thumbnailKey: string | null;
}

/**
 * Procesa una sola foto: descripción → embedding → DB.
 */
async function processPhoto(photo: PhotoToEmbed): Promise<boolean> {
  console.log(`[embedding] Processing photo ${photo.id}`);
  try {
    // Marcar como QUEUED
    await prisma.photo.update({
      where: { id: photo.id },
      data: { embeddingStatus: "QUEUED", embeddingUpdatedAt: new Date() },
    });

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
           "embeddingDescription" = $2,
           "embeddingUpdatedAt" = NOW()
       WHERE id = $3`,
      vectorStr,
      description,
      photo.id,
    );

    console.log(`[embedding] Photo ${photo.id} done`);
    return true;
  } catch (err) {
    console.error(`[embedding] Photo ${photo.id} failed:`, err);
    try {
      await prisma.photo.update({
        where: { id: photo.id },
        data: { embeddingStatus: "FAILED", embeddingUpdatedAt: new Date() },
      });
    } catch (updateErr) {
      console.error(`[embedding] Failed to mark ${photo.id} as FAILED:`, updateErr);
    }
    return false;
  }
}

/**
 * Retorna el progreso de generación de embeddings de un proyecto.
 * Procesa 1 foto PENDING sincrónicamente en cada llamada — garantizado
 * en Vercel Hobby (sin cron por minuto ni after()). El polling del
 * cliente sigue llamando hasta terminar todas.
 */
export async function getEmbeddingProgress(
  projectId: string,
): Promise<{ done: number; total: number; failed: number }> {
  // Rescatar QUEUED stuck (dispatcher anterior murió)
  const staleThreshold = new Date(Date.now() - STALE_QUEUED_MINUTES * 60 * 1000);
  await prisma.photo.updateMany({
    where: {
      projectId,
      embeddingStatus: "QUEUED",
      OR: [
        { embeddingUpdatedAt: null },
        { embeddingUpdatedAt: { lt: staleThreshold } },
      ],
    },
    data: { embeddingStatus: "PENDING" },
  });

  // Buscar 1 foto PENDING para procesar en este ciclo
  const nextPhoto = await prisma.photo.findFirst({
    where: { projectId, embeddingStatus: "PENDING" },
    select: { id: true, objectKey: true, thumbnailKey: true },
  });

  // Procesar 1 foto sincrónicamente
  if (nextPhoto) {
    await processPhoto(nextPhoto);
  }

  // Contar estados después de procesar
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

  return { done, total, failed };
}

/**
 * Dispara generación de embeddings para fotos recién subidas.
 * Llamado desde confirmUpload via after(). Si after() falla en serverless,
 * el cron job las recoge como PENDING.
 */
export async function dispatchEmbeddingGeneration(
  photos: PhotoToEmbed[],
): Promise<void> {
  if (photos.length === 0) return;

  console.log(`[embedding] Dispatching ${photos.length} photos`);
  let succeeded = 0;
  let failed = 0;

  for (const photo of photos) {
    const ok = await processPhoto(photo);
    if (ok) succeeded++;
    else failed++;
  }

  console.log(`[embedding] Done: ${succeeded} succeeded, ${failed} failed`);
}

/**
 * Procesa un batch de fotos PENDING de todos los proyectos.
 * Llamado por el cron job cada minuto. Rescata QUEUED stuck y procesa
 * hasta CRON_BATCH_SIZE fotos por ejecución.
 */
export async function processEmbeddingBatch(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  // Rescatar QUEUED stuck (dispatcher anterior murió)
  const staleThreshold = new Date(Date.now() - STALE_QUEUED_MINUTES * 60 * 1000);
  const rescued = await prisma.photo.updateMany({
    where: {
      embeddingStatus: "QUEUED",
      OR: [
        { embeddingUpdatedAt: null },
        { embeddingUpdatedAt: { lt: staleThreshold } },
      ],
    },
    data: { embeddingStatus: "PENDING" },
  });

  if (rescued.count > 0) {
    console.log(`[embedding-cron] Rescued ${rescued.count} stale QUEUED photos`);
  }

  // Buscar fotos PENDING de cualquier proyecto
  const photos = await prisma.photo.findMany({
    where: { embeddingStatus: "PENDING" },
    select: { id: true, objectKey: true, thumbnailKey: true },
    take: CRON_BATCH_SIZE,
    orderBy: { createdAt: "asc" }, // Más antiguas primero
  });

  if (photos.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  console.log(`[embedding-cron] Processing ${photos.length} photos`);
  let succeeded = 0;
  let failed = 0;

  for (const photo of photos) {
    const ok = await processPhoto(photo);
    if (ok) succeeded++;
    else failed++;
  }

  console.log(`[embedding-cron] Done: ${succeeded} succeeded, ${failed} failed`);
  return { processed: photos.length, succeeded, failed };
}

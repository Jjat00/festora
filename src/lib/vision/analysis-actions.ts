"use server";

/**
 * Festora — AI analysis dispatch & persistence layer.
 *
 * Responsabilidades:
 *   1. Generar presigned URLs de R2 para que festora-vision-api pueda
 *      acceder a las fotos sin exponer URLs permanentes.
 *   2. Llamar al batch endpoint de festora-vision-api.
 *   3. Mapear los resultados JSON al schema Prisma y persistir.
 *
 * Esta capa es la ÚNICA que conoce tanto la vision API como Prisma.
 * festora-vision-api no sabe nada de Prisma ni de R2.
 */

import { prisma } from "@/lib/prisma";
import { getSignedReadUrl } from "@/lib/r2";
import { VisionApiError, VisionClient } from "@/lib/vision/vision-client";

// Singleton — se crea una sola vez por proceso de servidor.
// Si VISION_API_URL no está configurada, las llamadas lanzan un error claro.
let _client: VisionClient | null = null;
function getClient(): VisionClient {
  if (!_client) {
    _client = VisionClient.fromEnv();
  }
  return _client;
}

const BATCH_SIZE = 20; // máximo que acepta festora-vision-api

// ------------------------------------------------------------------ //
// Función principal: analiza todas las fotos de un listado.
// Llamada con void desde confirmUpload (fire-and-forget).
// ------------------------------------------------------------------ //

export async function dispatchPhotoAnalysis(
  photos: Array<{ id: string; objectKey: string; thumbnailKey?: string | null }>
): Promise<void> {
  if (photos.length === 0) return;

  // Marcar como QUEUED de inmediato para que el dashboard muestre progreso.
  await prisma.photo.updateMany({
    where: { id: { in: photos.map((p) => p.id) } },
    data: { aiStatus: "QUEUED" },
  });

  // Procesar en lotes de MAX_BATCH_SIZE.
  for (let i = 0; i < photos.length; i += BATCH_SIZE) {
    const batch = photos.slice(i, i + BATCH_SIZE);
    await _processBatch(batch);
  }
}

async function _processBatch(
  photos: Array<{ id: string; objectKey: string; thumbnailKey?: string | null }>
): Promise<void> {
  // Usar thumbnails (800px WebP, ~100-200 KB) en lugar de originales (~10 MB).
  // Los thumbnails son suficientes para blur/BRISQUE/NIMA y evitan timeouts por OOM.
  // Fallback a objectKey si thumbnailKey no existe.
  let presignedUrls: string[];
  try {
    presignedUrls = await Promise.all(
      photos.map((p) => getSignedReadUrl(p.thumbnailKey ?? p.objectKey))
    );
  } catch (err) {
    console.error("[vision] Error generating presigned URLs:", err);
    await _markBatchFailed(photos.map((p) => p.id));
    return;
  }

  // Llamar a la vision API.
  let batchResponse;
  try {
    batchResponse = await getClient().analyzePhotoBatch({
      images: photos.map((photo, i) => ({
        url: presignedUrls[i],
        imageId: photo.id,
      })),
      run_blur: true,
      run_quality: true,
      run_emotion: false,    // Fase 2
      run_embedding: false,  // Fase 4
    });
  } catch (err) {
    if (err instanceof VisionApiError) {
      console.error(
        `[vision] Batch call failed: [${err.code}] ${err.message}`
      );
    } else {
      console.error("[vision] Unexpected error in batch call:", err);
    }
    await _markBatchFailed(photos.map((p) => p.id));
    return;
  }

  // Persistir resultados individuales.
  const now = new Date();
  await Promise.all(
    batchResponse.results.map(async (result) => {
      if (!result.image_id) return;

      if (result.error) {
        console.error(
          `[vision] Analysis error for photo ${result.image_id}: ${result.error}`
        );
        await prisma.photo.update({
          where: { id: result.image_id },
          data: { aiStatus: "FAILED", aiProcessedAt: now },
        });
        return;
      }

      await prisma.photo.update({
        where: { id: result.image_id },
        data: {
          aiStatus: "DONE",
          aiProcessedAt: now,
          // Fase 1: blur score = Laplacian variance
          blurScore: result.blur?.laplacian_variance ?? null,
          // Fase 1: BRISQUE técnico
          brisqueScore: result.quality?.brisque_score ?? null,
          // Fase 1: NIMA estética (más relevante para el fotógrafo)
          nimaScore: result.aesthetic?.nima_aesthetic_score ?? null,
        },
      });
    })
  );
}

async function _markBatchFailed(photoIds: string[]): Promise<void> {
  const now = new Date();
  await prisma.photo.updateMany({
    where: { id: { in: photoIds } },
    data: { aiStatus: "FAILED", aiProcessedAt: now },
  });
}

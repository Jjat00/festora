"use server";

import { prisma } from "@/lib/prisma";
import { getSignedReadUrl } from "@/lib/r2";
import { analyzeAllPhotos, type PhotoInput } from "@/lib/ai/analyze";
import type { PhotoAnalysis } from "@/lib/ai/schemas";

const VALID_CATEGORIES = new Set([
  "preparativos", "ceremonia", "retratos", "grupo",
  "recepcion", "fiesta", "detalles", "paisaje", "otro",
]);

/** Normaliza variantes como "Retratos", "retrato", "La Ceremonia" → categoría canónica. */
function normalizeCategory(raw: string): string {
  const lower = raw.toLowerCase().trim()
    .replace(/^(la |el |los |las )/, "")
    .replace(/s$/, ""); // "retratos" → "retrato"

  // Mapeo de variantes comunes
  const aliases: Record<string, string> = {
    retrato: "retratos",
    preparativo: "preparativos",
    detalle: "detalles",
    recepción: "recepcion",
    baile: "fiesta",
    "primer baile": "fiesta",
    brindis: "fiesta",
    vals: "fiesta",
    exterior: "paisaje",
    jardín: "paisaje",
    jardin: "paisaje",
    grupal: "grupo",
    familiar: "grupo",
  };

  const normalized = aliases[lower] ?? lower + "s"; // re-pluralizar si no hay alias
  return VALID_CATEGORIES.has(normalized) ? normalized : (VALID_CATEGORIES.has(lower) ? lower : "otro");
}

/**
 * Analiza fotos con el AI SDK (fire-and-forget).
 * Genera presigned URLs, llama al LLM en batches, y persiste los resultados.
 */
export async function dispatchPhotoAnalysis(
  photos: Array<{ id: string; objectKey: string; thumbnailKey: string | null }>
): Promise<void> {
  if (photos.length === 0) return;

  // Marcar como QUEUED
  await prisma.photo.updateMany({
    where: { id: { in: photos.map((p) => p.id) } },
    data: { aiStatus: "QUEUED" },
  });

  // Generar presigned URLs para thumbnails
  let photoInputs: PhotoInput[];
  try {
    photoInputs = await Promise.all(
      photos.map(async (p) => ({
        id: p.id,
        thumbnailUrl: await getSignedReadUrl(p.thumbnailKey ?? p.objectKey),
      }))
    );
  } catch (err) {
    console.error("[ai] Error generating presigned URLs:", err);
    await markBatchFailed(photos.map((p) => p.id));
    return;
  }

  // Analizar con AI SDK
  let results: PhotoAnalysis[];
  let tokensUsed: number;
  try {
    const response = await analyzeAllPhotos(photoInputs);
    results = response.results;
    tokensUsed = response.tokensUsed;
  } catch (err) {
    console.error("[ai] Analysis error:", err);
    await markBatchFailed(photos.map((p) => p.id));
    return;
  }

  console.log(`[ai] Analyzed ${results.length}/${photos.length} photos | ${tokensUsed} tokens`);

  // Crear un mapa de resultados por photoId
  const resultMap = new Map(results.map((r) => [r.photoId, r]));
  const now = new Date();

  // Persistir resultados
  await Promise.all(
    photos.map(async (photo) => {
      const result = resultMap.get(photo.id);
      if (!result) {
        await prisma.photo.update({
          where: { id: photo.id },
          data: { aiStatus: "FAILED", aiProcessedAt: now },
        });
        return;
      }

      await prisma.photo.update({
        where: { id: photo.id },
        data: {
          aiStatus: "DONE",
          aiProcessedAt: now,
          blurScore: result.blurScore,
          compositeScore: result.compositeScore,
          emotionLabel: result.emotion?.label ?? null,
          emotionValence: result.emotion?.valence ?? null,
          llmScore: result.overallScore,
          llmModel: "gpt-4o-mini",
          llmSummary: result.summary,
          llmDiscardReason: result.discardReason,
          llmBestInGroup: result.bestInGroup,
          llmComposition: result.composition,
          llmPoseQuality: result.poseQuality,
          llmBackgroundQuality: result.backgroundQuality,
          llmHighlights: result.highlights,
          llmIssues: result.issues,
          llmTokensUsed: tokensUsed,
          llmAnalyzedAt: now,
          llmCategory: normalizeCategory(result.category),
          llmTags: result.tags,
        },
      });
    })
  );
}

async function markBatchFailed(photoIds: string[]): Promise<void> {
  await prisma.photo.updateMany({
    where: { id: { in: photoIds } },
    data: { aiStatus: "FAILED", aiProcessedAt: new Date() },
  });
}

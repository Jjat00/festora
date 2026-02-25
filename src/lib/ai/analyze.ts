import { generateText, Output, type UserContent } from "ai";
import { getAnalysisModel } from "./provider";
import { photoAnalysisSchema, type PhotoAnalysis } from "./schemas";
import { PHOTO_ANALYSIS_SYSTEM, buildBatchPrompt } from "./prompts";

const BATCH_SIZE = 5;

export interface PhotoInput {
  id: string;
  thumbnailUrl: string;
}

interface BatchResult {
  results: PhotoAnalysis[];
  tokensUsed: number;
}

/**
 * Analiza un lote de fotos con el LLM.
 * Envía hasta BATCH_SIZE fotos por llamada para optimizar costo.
 */
export async function analyzePhotoBatch(photos: PhotoInput[]): Promise<BatchResult> {
  const content: UserContent = [
    { type: "text", text: buildBatchPrompt(photos.map((p) => p.id)) },
  ];

  for (const photo of photos) {
    content.push(
      { type: "text", text: `Foto ${photo.id}:` },
      { type: "image", image: new URL(photo.thumbnailUrl) },
    );
  }

  const { output, usage } = await generateText({
    model: getAnalysisModel(),
    system: PHOTO_ANALYSIS_SYSTEM,
    output: Output.array({ element: photoAnalysisSchema }),
    messages: [{ role: "user", content }],
    maxOutputTokens: 600 * photos.length,
    temperature: 0.1,
  });

  return {
    results: output ?? [],
    tokensUsed: usage.totalTokens ?? 0,
  };
}

/**
 * Analiza todas las fotos en lotes de BATCH_SIZE.
 * Retorna todos los resultados y el total de tokens consumidos.
 */
export async function analyzeAllPhotos(
  photos: PhotoInput[]
): Promise<BatchResult> {
  const allResults: PhotoAnalysis[] = [];
  let totalTokens = 0;

  for (let i = 0; i < photos.length; i += BATCH_SIZE) {
    const batch = photos.slice(i, i + BATCH_SIZE);
    const { results, tokensUsed } = await analyzePhotoBatch(batch);
    allResults.push(...results);
    totalTokens += tokensUsed;
  }

  return { results: allResults, tokensUsed: totalTokens };
}

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

const MODEL = "gemini-embedding-2-preview";
const DIMENSIONS = 768;
const MAX_CONCURRENT = 3;

/** L2-normalize un vector (obligatorio para dimensiones < 3072). */
function normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

/**
 * Genera un embedding agregado multimodal (texto + imagen) para indexar una foto.
 * Combina la descripción textual del análisis AI con la imagen thumbnail
 * en un solo vector de 768 dimensiones.
 */
export async function generatePhotoEmbedding(
  textContent: string,
  imageBase64: string,
  mimeType: "image/webp" | "image/jpeg" | "image/png",
): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: MODEL,
    contents: [
      {
        parts: [
          { text: textContent },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      },
    ],
    config: {
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: DIMENSIONS,
    },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values) throw new Error("Gemini embedding returned no values");

  return normalize(values);
}

/**
 * Genera un embedding de texto para búsqueda.
 * Usa RETRIEVAL_QUERY para optimizar la búsqueda contra documentos indexados.
 */
export async function generateQueryEmbedding(
  query: string,
): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: MODEL,
    contents: query,
    config: {
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: DIMENSIONS,
    },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values) throw new Error("Gemini query embedding returned no values");

  return normalize(values);
}

/**
 * Arma el texto de contexto para el embedding a partir del análisis AI.
 */
export function buildEmbeddingText(analysis: {
  summary?: string | null;
  category?: string | null;
  tags?: string[];
}): string {
  const parts: string[] = [];
  if (analysis.summary) parts.push(analysis.summary);
  if (analysis.category) parts.push(`Categoría: ${analysis.category}`);
  if (analysis.tags?.length) parts.push(`Tags: ${analysis.tags.join(", ")}`);
  return parts.join(". ");
}

export interface PhotoEmbeddingInput {
  id: string;
  textContent: string;
  imageBase64: string;
  mimeType: "image/webp" | "image/jpeg" | "image/png";
}

/**
 * Genera embeddings para un batch de fotos en paralelo (máx MAX_CONCURRENT).
 * Retorna un Map de photoId → vector. Las fotos que fallan se omiten.
 */
export async function generateBatchPhotoEmbeddings(
  photos: PhotoEmbeddingInput[],
): Promise<Map<string, number[]>> {
  const results = new Map<string, number[]>();

  // Procesar con concurrencia limitada
  for (let i = 0; i < photos.length; i += MAX_CONCURRENT) {
    const chunk = photos.slice(i, i + MAX_CONCURRENT);
    const settled = await Promise.allSettled(
      chunk.map(async (photo) => {
        const embedding = await generatePhotoEmbedding(
          photo.textContent,
          photo.imageBase64,
          photo.mimeType,
        );
        return { id: photo.id, embedding };
      }),
    );

    for (const result of settled) {
      if (result.status === "fulfilled") {
        results.set(result.value.id, result.value.embedding);
      } else {
        console.error("[embedding] Failed for photo:", result.reason);
      }
    }
  }

  return results;
}

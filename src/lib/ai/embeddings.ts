import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

const MODEL = "gemini-embedding-2-preview";
const DIMENSIONS = 768;

/** L2-normalize un vector (obligatorio para dimensiones < 3072). */
function normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

/**
 * Genera un embedding agregado multimodal (texto + imagen) para indexar una foto.
 * Combina la descripción textual con la imagen thumbnail en un solo vector
 * de 768 dimensiones.
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


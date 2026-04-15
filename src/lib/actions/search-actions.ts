"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateQueryEmbedding } from "@/lib/ai/embeddings";

export interface SearchResult {
  id: string;
  thumbnailKey: string | null;
  originalFilename: string;
  width: number | null;
  height: number | null;
  llmCategory: string | null;
  compositeScore: number | null;
  similarity: number;
}

export interface GallerySearchResult extends SearchResult {
  selected: boolean;
}

const MIN_SIMILARITY = 0.3;
const MAX_QUERY_LENGTH = 200;

/**
 * Búsqueda semántica de fotos para el fotógrafo (autenticado).
 * Genera un embedding del query y busca por cosine similarity en pgvector.
 */
export async function searchProjectPhotos(
  projectId: string,
  query: string,
  limit: number = 20,
): Promise<SearchResult[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Verificar ownership
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId: session.user.id },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found");

  const trimmed = query.trim();
  if (!trimmed || trimmed.length > MAX_QUERY_LENGTH) return [];

  const queryEmbedding = await generateQueryEmbedding(trimmed);
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  const results = await prisma.$queryRawUnsafe<SearchResult[]>(
    `SELECT
      id,
      "thumbnailKey",
      "originalFilename",
      width,
      height,
      "llmCategory",
      "compositeScore",
      1 - (embedding <=> $1::vector) AS similarity
    FROM "Photo"
    WHERE "projectId" = $2
      AND embedding IS NOT NULL
      AND "embeddingStatus" = 'DONE'
    ORDER BY embedding <=> $1::vector
    LIMIT $3`,
    vectorStr,
    projectId,
    limit,
  );

  return results.filter((r) => r.similarity >= MIN_SIMILARITY);
}

/**
 * Búsqueda semántica de fotos para la galería pública (cliente).
 * No requiere autenticación — la protección por PIN se maneja en la página.
 */
export async function searchGalleryPhotos(
  projectId: string,
  query: string,
  limit: number = 20,
): Promise<GallerySearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > MAX_QUERY_LENGTH) return [];

  const queryEmbedding = await generateQueryEmbedding(trimmed);
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  const results = await prisma.$queryRawUnsafe<GallerySearchResult[]>(
    `SELECT
      p.id,
      p."thumbnailKey",
      p."originalFilename",
      p.width,
      p.height,
      p."llmCategory",
      p."compositeScore",
      1 - (p.embedding <=> $1::vector) AS similarity,
      CASE WHEN s.id IS NOT NULL THEN true ELSE false END AS selected
    FROM "Photo" p
    LEFT JOIN "Selection" s ON s."photoId" = p.id
    WHERE p."projectId" = $2
      AND p.embedding IS NOT NULL
      AND p."embeddingStatus" = 'DONE'
    ORDER BY p.embedding <=> $1::vector
    LIMIT $3`,
    vectorStr,
    projectId,
    limit,
  );

  return results.filter((r) => r.similarity >= MIN_SIMILARITY);
}

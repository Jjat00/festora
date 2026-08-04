import type { AlbumSuggestion, Prisma } from "@prisma/client";

/**
 * Qué fotos componen un álbum. Vive aquí porque la vista del álbum y su
 * descarga tienen que coincidir: cuando el criterio estaba duplicado, el ZIP
 * incluía descartadas, ignoraba `photoCount` y en `_highlights` salía vacío
 * (no es una categoría real, es "las mejores del proyecto").
 */
export function albumPhotoQuery(
  album: Pick<AlbumSuggestion, "category" | "photoCount">,
  projectId: string
): {
  where: Prisma.PhotoWhereInput;
  orderBy: Prisma.PhotoOrderByWithRelationInput;
  take: number;
} {
  return {
    where:
      album.category === "_highlights"
        ? { projectId, llmDiscardReason: null, compositeScore: { not: null } }
        : { projectId, llmCategory: album.category, llmDiscardReason: null },
    orderBy: { compositeScore: "desc" },
    take: album.photoCount,
  };
}

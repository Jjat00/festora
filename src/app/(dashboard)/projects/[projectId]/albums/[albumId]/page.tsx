import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/project-actions";
import { prisma } from "@/lib/prisma";
import { AlbumDetail } from "@/components/dashboard/album-detail";

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; albumId: string }>;
}) {
  const { projectId, albumId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  const album = await prisma.albumSuggestion.findUnique({
    where: { id: albumId },
  });
  if (!album || album.projectId !== projectId) notFound();

  // Álbum highlights: mejores fotos del proyecto sin importar categoría
  // Álbum por categoría: top 30% sin descartes, limitado a album.photoCount
  const photos = await prisma.photo.findMany({
    where:
      album.category === "_highlights"
        ? { projectId, llmDiscardReason: null, compositeScore: { not: null } }
        : { projectId, llmCategory: album.category, llmDiscardReason: null },
    orderBy: { compositeScore: "desc" },
    take: album.photoCount,
    include: { selection: { select: { id: true } } },
  });

  return (
    <AlbumDetail
      album={album}
      photos={photos}
      projectId={projectId}
    />
  );
}

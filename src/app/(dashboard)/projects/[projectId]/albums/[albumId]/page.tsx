import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/project-actions";
import { prisma } from "@/lib/prisma";
import { AlbumDetail } from "@/components/dashboard/album-detail";
import { albumPhotoQuery } from "@/lib/album-photos";

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
    ...albumPhotoQuery(album, projectId),
    include: { selection: { select: { id: true } } },
  });

  return (
    <AlbumDetail
      album={album}
      photos={photos}
      projectId={projectId}
      projectName={project.name}
    />
  );
}

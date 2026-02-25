import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/project-actions";
import { prisma } from "@/lib/prisma";
import { AlbumGrid } from "@/components/dashboard/album-grid";

export default async function AlbumsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  const albums = await prisma.albumSuggestion.findMany({
    where: { projectId },
    orderBy: { photoCount: "desc" },
  });

  const analyzedCount = await prisma.photo.count({
    where: { projectId, aiStatus: "DONE" },
  });

  return (
    <div>
      <AlbumGrid
        projectId={projectId}
        albums={albums}
        hasAnalyzedPhotos={analyzedCount > 0}
      />
    </div>
  );
}

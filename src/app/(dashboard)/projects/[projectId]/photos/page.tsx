import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/project-actions";
import { getProjectPhotos } from "@/lib/actions/photo-actions";
import { getUserStorageUsage } from "@/lib/actions/storage-actions";
import { PhotoGrid } from "@/components/dashboard/photo-grid";
import { UploadZone } from "@/components/dashboard/upload-zone";
import { AiStatusBanner } from "@/components/dashboard/ai-status-banner";
import Link from "next/link";

export default async function PhotosPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  const [photos, storage] = await Promise.all([
    getProjectPhotos(projectId),
    getUserStorageUsage(),
  ]);

  const processingCount = photos.filter(
    (p) => p.aiStatus === "PENDING" || p.aiStatus === "QUEUED"
  ).length;

  return (
    <div>
      <Link
        href={`/projects/${projectId}`}
        className="mb-4 inline-block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        &larr; {project.name}
      </Link>
      <h1 className="mb-2 text-2xl font-semibold">Fotos</h1>
      <p className="mb-8 text-sm text-[var(--muted-foreground)]">
        {photos.length} foto{photos.length !== 1 && "s"} subidas
      </p>

      <UploadZone
        projectId={projectId}
        storageUsed={storage.used}
        storageLimit={storage.limit}
      />

      {processingCount > 0 && (
        <AiStatusBanner
          projectId={projectId}
          initialProcessing={processingCount}
        />
      )}

      {photos.length > 0 && (
        <PhotoGrid photos={photos} projectId={projectId} />
      )}
    </div>
  );
}

import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/project-actions";
import { getProjectPhotos } from "@/lib/actions/photo-actions";
import { getUserStorageUsage } from "@/lib/actions/storage-actions";
import { PhotoGrid } from "@/components/dashboard/photo-grid";
import { UploadZone } from "@/components/dashboard/upload-zone";
import { AiStatusBanner } from "@/components/dashboard/ai-status-banner";
import { LlmAnalysisSection } from "@/components/dashboard/llm-analysis-button";

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

  // Fotos actualmente en cola (being processed by after())
  const queuedCount = photos.filter(
    (p) => p.aiStatus === "QUEUED",
  ).length;

  // Fotos pendientes de analizar o que fallaron (candidatas para análisis)
  const pendingOrFailedCount = photos.filter(
    (p) => p.aiStatus === "PENDING" || p.aiStatus === "FAILED",
  ).length;

  return (
    <div>
      <UploadZone
        projectId={projectId}
        storageUsed={storage.used}
        storageLimit={storage.limit}
      />

      {/* Banner de progreso — visible mientras hay fotos en cola */}
      {queuedCount > 0 && (
        <AiStatusBanner
          projectId={projectId}
          initialQueued={queuedCount}
        />
      )}

      {/* Sección de análisis IA — visible si hay fotos por analizar */}
      {photos.length > 0 && pendingOrFailedCount > 0 && queuedCount === 0 && (
        <LlmAnalysisSection
          projectId={projectId}
          totalPhotos={photos.length}
          pendingPhotos={pendingOrFailedCount}
        />
      )}

      {photos.length > 0 && <PhotoGrid photos={photos} projectId={projectId} />}
    </div>
  );
}

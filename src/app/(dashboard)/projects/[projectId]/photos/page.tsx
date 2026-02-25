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

  // Fotos esperando ser analizadas (nunca se han procesado o fallaron)
  const pendingCount = photos.filter(
    (p) => p.aiStatus === "PENDING" || p.aiStatus === "FAILED",
  ).length;

  // Fotos actualmente en proceso (ya en cola o procesando)
  const processingCount = photos.filter(
    (p) => p.aiStatus === "QUEUED",
  ).length;

  return (
    <div>
      <UploadZone
        projectId={projectId}
        storageUsed={storage.used}
        storageLimit={storage.limit}
      />

      {/* Banner de progreso — visible mientras hay fotos en cola */}
      {processingCount > 0 && (
        <AiStatusBanner
          projectId={projectId}
          initialProcessing={processingCount}
        />
      )}

      {/* Sección de análisis IA — botón + banner */}
      {photos.length > 0 && processingCount === 0 && pendingCount > 0 && (
        <LlmAnalysisSection
          projectId={projectId}
          totalPhotos={photos.length}
          pendingPhotos={pendingCount}
        />
      )}

      {photos.length > 0 && <PhotoGrid photos={photos} projectId={projectId} />}
    </div>
  );
}

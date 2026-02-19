import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/project-actions";
import { getProjectPhotos } from "@/lib/actions/photo-actions";
import { getUserStorageUsage } from "@/lib/actions/storage-actions";
import { PhotoGrid } from "@/components/dashboard/photo-grid";
import { UploadZone } from "@/components/dashboard/upload-zone";
import { AiStatusBanner } from "@/components/dashboard/ai-status-banner";
import { AnalyzeButton } from "@/components/dashboard/analyze-button";
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

  // Fotos destacadas para el LLM (compositeScore >= 65)
  const highlightedCount = photos.filter(
    (p) => p.compositeScore != null && p.compositeScore >= 65,
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

      {/* Botón manual de análisis — visible cuando hay fotos sin analizar y no hay análisis en curso */}
      {pendingCount > 0 && processingCount === 0 && photos.length > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {pendingCount} foto{pendingCount !== 1 ? "s" : ""} sin analizar
          </p>
          <div className="flex items-center gap-3">
            <AnalyzeButton projectId={projectId} pendingCount={pendingCount} />
          </div>
        </div>
      )}

      {/* Sección LLM — banner de progreso + botón trigger */}
      {photos.length > 0 && processingCount === 0 && (
        <LlmAnalysisSection
          projectId={projectId}
          totalPhotos={photos.length}
          highlightedPhotos={highlightedCount}
        />
      )}

      {photos.length > 0 && <PhotoGrid photos={photos} projectId={projectId} />}
    </div>
  );
}

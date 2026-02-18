import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/project-actions";
import { getProjectPhotos } from "@/lib/actions/photo-actions";
import { getUserStorageUsage } from "@/lib/actions/storage-actions";
import { PhotoGrid } from "@/components/dashboard/photo-grid";
import { UploadZone } from "@/components/dashboard/upload-zone";

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

  return (
    <div>
      <UploadZone
        projectId={projectId}
        storageUsed={storage.used}
        storageLimit={storage.limit}
      />

      {photos.length > 0 && (
        <PhotoGrid photos={photos} projectId={projectId} />
      )}
    </div>
  );
}

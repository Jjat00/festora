"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { confirmUpload } from "@/lib/actions/photo-actions";
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE, MAX_CONCURRENT_UPLOADS, THUMBNAIL_MAX_WIDTH } from "@/lib/constants";

interface UploadProgress {
  filename: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
}

async function generateThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, THUMBNAIL_MAX_WIDTH / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Failed to generate thumbnail"))),
        "image/webp",
        0.8
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function UploadZone({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const validFiles = Array.from(files).filter(
        (f) => ALLOWED_IMAGE_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE
      );
      if (validFiles.length === 0) return;

      setUploading(true);
      setUploads(validFiles.map((f) => ({ filename: f.name, progress: 0, status: "pending" })));

      // Get presigned URLs
      const res = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          files: validFiles.map((f) => ({ filename: f.name, contentType: f.type, size: f.size })),
        }),
      });

      if (!res.ok) {
        setUploads((prev) => prev.map((u) => ({ ...u, status: "error" as const })));
        setUploading(false);
        return;
      }

      const { presignedUrls } = await res.json();

      // Upload in batches
      const confirmData: {
        objectKey: string;
        thumbnailKey: string;
        originalFilename: string;
        width?: number;
        height?: number;
        size: number;
      }[] = [];

      const uploadFile = async (index: number) => {
        const file = validFiles[index];
        const urls = presignedUrls[index];

        setUploads((prev) =>
          prev.map((u, i) => (i === index ? { ...u, status: "uploading" as const } : u))
        );

        try {
          // Generate thumbnail and get dimensions
          const [thumbnail, dimensions] = await Promise.all([
            generateThumbnail(file),
            getImageDimensions(file),
          ]);

          // Upload original and thumbnail in parallel
          await Promise.all([
            fetch(urls.uploadUrl, {
              method: "PUT",
              body: file,
              headers: { "Content-Type": file.type },
            }),
            fetch(urls.thumbnailUploadUrl, {
              method: "PUT",
              body: thumbnail,
              headers: { "Content-Type": "image/webp" },
            }),
          ]);

          confirmData.push({
            objectKey: urls.objectKey,
            thumbnailKey: urls.thumbnailKey,
            originalFilename: file.name,
            width: dimensions.width,
            height: dimensions.height,
            size: file.size,
          });

          setUploads((prev) =>
            prev.map((u, i) => (i === index ? { ...u, progress: 100, status: "done" as const } : u))
          );
        } catch {
          setUploads((prev) =>
            prev.map((u, i) => (i === index ? { ...u, status: "error" as const } : u))
          );
        }
      };

      // Process in batches of MAX_CONCURRENT_UPLOADS
      for (let i = 0; i < validFiles.length; i += MAX_CONCURRENT_UPLOADS) {
        const batch = validFiles
          .slice(i, i + MAX_CONCURRENT_UPLOADS)
          .map((_, batchIdx) => uploadFile(i + batchIdx));
        await Promise.all(batch);
      }

      // Confirm uploads in DB
      if (confirmData.length > 0) {
        await confirmUpload(projectId, confirmData);
      }

      setUploading(false);
      router.refresh();
    },
    [projectId, router]
  );

  return (
    <div className="mb-8">
      <label
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] p-8 transition-colors hover:border-[var(--accent)] ${uploading ? "pointer-events-none opacity-50" : ""}`}
      >
        <p className="mb-1 font-medium">
          {uploading ? "Subiendo..." : "Arrastra fotos o haz clic para seleccionar"}
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">
          JPG, PNG, WebP, HEIC. Máximo 20MB por foto.
        </p>
        <input
          type="file"
          multiple
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={uploading}
        />
      </label>

      {uploads.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploads.map((u, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="flex-1 truncate">{u.filename}</span>
              <span
                className={
                  u.status === "done"
                    ? "text-green-500"
                    : u.status === "error"
                      ? "text-red-500"
                      : "text-[var(--muted-foreground)]"
                }
              >
                {u.status === "done"
                  ? "Listo"
                  : u.status === "error"
                    ? "Error"
                    : u.status === "uploading"
                      ? "Subiendo..."
                      : "En espera"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

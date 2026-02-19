"use client";

import { useState, useCallback, useRef, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmUpload } from "@/lib/actions/photo-actions";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  MAX_CONCURRENT_UPLOADS,
  THUMBNAIL_MAX_WIDTH,
} from "@/lib/constants";

interface StagedFile {
  file: File;
  previewUrl: string;
  status: "staged" | "uploading" | "done" | "error";
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
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("Failed to generate thumbnail")),
        "image/webp",
        0.8
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function isDuplicate(file: File, existing: StagedFile[]): boolean {
  return existing.some(
    (s) => s.file.name === file.name && s.file.size === file.size
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

export function UploadZone({
  projectId,
  storageUsed,
  storageLimit,
}: {
  projectId: string;
  storageUsed: number;
  storageLimit: number;
}) {
  const router = useRouter();
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const stagedSize = stagedFiles.reduce((sum, s) => sum + s.file.size, 0);
  const wouldExceed = storageUsed + stagedSize > storageLimit;
  const availableSpace = storageLimit - storageUsed;

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      stagedFiles.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback(
    async (fileList: FileList) => {
      // Use a Set for O(1) duplicate lookup
      const existingKeys = new Set(
        stagedFiles.map((s) => `${s.file.name}-${s.file.size}`)
      );
      const newFiles = Array.from(fileList).filter(
        (f) =>
          ALLOWED_IMAGE_TYPES.includes(f.type) &&
          f.size <= MAX_FILE_SIZE &&
          !existingKeys.has(`${f.name}-${f.size}`)
      );
      if (newFiles.length === 0) return;
      setStorageError(null);

      // Add files in chunks of 20 to keep the main thread free between renders
      const CHUNK = 20;
      for (let i = 0; i < newFiles.length; i += CHUNK) {
        const chunk = newFiles.slice(i, i + CHUNK);
        const newStaged: StagedFile[] = chunk.map((file) => ({
          file,
          previewUrl: URL.createObjectURL(file),
          status: "staged" as const,
        }));
        startTransition(() => {
          setStagedFiles((prev) => [...prev, ...newStaged]);
        });
        // Yield to the main thread between chunks so the UI stays responsive
        await new Promise<void>((r) => setTimeout(r, 0));
      }
    },
    [stagedFiles]
  );

  const removeFile = useCallback((index: number) => {
    setStagedFiles((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleUpload = useCallback(async () => {
    if (stagedFiles.length === 0 || isUploading) return;

    setIsUploading(true);
    setUploadedCount(0);

    setStagedFiles((prev) =>
      prev.map((s) => ({ ...s, status: "uploading" as const }))
    );

    const validFiles = stagedFiles.map((s) => s.file);

    // Get presigned URLs
    const res = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        files: validFiles.map((f) => ({
          filename: f.name,
          contentType: f.type,
          size: f.size,
        })),
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      if (errorData?.error === "STORAGE_LIMIT_EXCEEDED") {
        setStorageError(
          `Almacenamiento insuficiente. Usados: ${formatBytes(errorData.used)}, límite: ${formatBytes(errorData.limit)}`
        );
      }
      setStagedFiles((prev) =>
        prev.map((s) => ({ ...s, status: "error" as const }))
      );
      setIsUploading(false);
      return;
    }

    const { presignedUrls } = await res.json();

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

      try {
        const [thumbnail, dimensions] = await Promise.all([
          generateThumbnail(file),
          getImageDimensions(file),
        ]);

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

        setStagedFiles((prev) =>
          prev.map((s, i) =>
            i === index ? { ...s, status: "done" as const } : s
          )
        );
        setUploadedCount((c) => c + 1);
      } catch {
        setStagedFiles((prev) =>
          prev.map((s, i) =>
            i === index ? { ...s, status: "error" as const } : s
          )
        );
        setUploadedCount((c) => c + 1);
      }
    };

    // Process in batches
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

    // Cleanup
    stagedFiles.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    setStagedFiles([]);
    setIsUploading(false);
    setUploadedCount(0);
    router.refresh();
  }, [stagedFiles, isUploading, projectId, router]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);
      if (!isUploading && e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [isUploading, addFiles]
  );

  const progressPercent =
    stagedFiles.length > 0
      ? Math.round((uploadedCount / stagedFiles.length) * 100)
      : 0;

  const hasFiles = stagedFiles.length > 0;

  return (
    <div
      className="mb-8"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Compact storage bar */}
      <div className="mb-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full transition-all ${
              storageUsed / storageLimit > 0.95
                ? "bg-red-500"
                : storageUsed / storageLimit > 0.8
                  ? "bg-amber-500"
                  : "bg-foreground"
            }`}
            style={{
              width: `${Math.min((storageUsed / storageLimit) * 100, 100)}%`,
            }}
          />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatBytes(storageUsed)} de {formatBytes(storageLimit)}
        </span>
      </div>

      {/* Storage warning */}
      {wouldExceed && hasFiles && (
        <div className="mb-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">
          Las fotos seleccionadas ({formatBytes(stagedSize)}) exceden el espacio
          disponible ({formatBytes(Math.max(0, availableSpace))})
        </div>
      )}

      {/* Storage error from server */}
      {storageError && (
        <div className="mb-3 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {storageError}
        </div>
      )}

      {/* Drop zone */}
      <button
        type="button"
        onClick={() => !isUploading && inputRef.current?.click()}
        disabled={isUploading}
        className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
          isDragging
            ? "border-foreground bg-foreground/5"
            : "border-border hover:border-accent"
        } ${isUploading ? "pointer-events-none opacity-50" : ""} ${
          hasFiles ? "p-4" : "p-8"
        }`}
      >
        <p className={`font-medium ${hasFiles ? "text-sm" : ""}`}>
          {hasFiles
            ? "Arrastra o haz clic para agregar más fotos"
            : "Arrastra fotos o haz clic para seleccionar"}
        </p>
        {!hasFiles && (
          <p className="mt-1 text-sm text-muted-foreground">
            JPG, PNG, WebP, HEIC. Máximo 20MB por foto.
          </p>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
        disabled={isUploading}
      />

      {/* Staged files preview */}
      {hasFiles && (
        <div className="mt-4">
          {/* Header with count and upload button */}
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isUploading
                ? `Subiendo ${uploadedCount} de ${stagedFiles.length}...`
                : `${stagedFiles.length} foto${stagedFiles.length !== 1 ? "s" : ""} seleccionada${stagedFiles.length !== 1 ? "s" : ""}`}
            </p>
            {!isUploading && (
              <button
                type="button"
                onClick={handleUpload}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                disabled={stagedFiles.length === 0 || wouldExceed}
              >
                Subir fotos
              </button>
            )}
          </div>

          {/* Progress bar */}
          {isUploading && (
            <div className="mb-3 h-1 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* Thumbnails grid */}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {stagedFiles.map((staged, index) => (
              <div
                key={`${staged.file.name}-${staged.file.size}`}
                className="group relative aspect-square overflow-hidden rounded-lg bg-border"
              >
                <img
                  src={staged.previewUrl}
                  alt={staged.file.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />

                {/* Remove button (only when not uploading) */}
                {!isUploading && (
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    ×
                  </button>
                )}

                {/* Upload status overlay */}
                {staged.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  </div>
                )}
                {staged.status === "done" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
                {staged.status === "error" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-900/40">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

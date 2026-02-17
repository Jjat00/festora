"use client";

import { useState } from "react";
import { Lightbox } from "@/components/lightbox";

interface SelectionItem {
  id: string;
  photoId: string;
  filename: string;
  thumbnailKey: string | null;
}

export function SelectionsView({
  projectId,
  projectName,
  selections,
}: {
  projectId: string;
  projectName: string;
  selections: SelectionItem[];
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  function handleExportCSV() {
    const csv = [
      "photo_id,filename",
      ...selections.map((s) => `${s.photoId},${s.filename}`),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName}-favoritas.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownload() {
    window.open(
      `/api/projects/${projectId}/download?type=favorites`,
      "_blank"
    );
  }

  if (selections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] py-16">
        <p className="text-lg font-medium">Sin selecciones</p>
        <p className="text-sm text-[var(--muted-foreground)]">
          El cliente aún no ha seleccionado favoritas
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex gap-3">
        <button
          onClick={handleExportCSV}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:border-[var(--accent)]"
        >
          Exportar CSV
        </button>
        <button
          onClick={handleDownload}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90"
        >
          Descargar favoritas
        </button>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {selections.map((s, i) => (
          <div
            key={s.id}
            className="overflow-hidden rounded-lg border border-[var(--border)] ring-2 ring-[var(--accent)]"
          >
            <div
              className="aspect-square cursor-pointer bg-[var(--muted)]"
              onClick={() => setLightboxIndex(i)}
            >
              {s.thumbnailKey && (
                <img
                  src={`/api/photo/${s.photoId}/thumbnail`}
                  alt={s.filename}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
            <div className="flex items-center justify-between p-2">
              <p className="truncate text-xs text-[var(--muted-foreground)]">
                {s.filename}
              </p>
              <a
                href={`/api/photo/${s.photoId}/download`}
                download
                className="shrink-0 ml-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                </svg>
              </a>
            </div>
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={selections.map((s) => ({
            id: s.photoId,
            filename: s.filename,
          }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          showDownload
        />
      )}
    </div>
  );
}

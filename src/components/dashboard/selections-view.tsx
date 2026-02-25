"use client";

import { useState } from "react";
import { Lightbox } from "@/components/lightbox";

interface SelectionItem {
  id: string;
  photoId: string;
  filename: string;
  thumbnailKey: string | null;
  width: number | null;
  height: number | null;
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
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <p className="text-lg font-medium">Sin selecciones</p>
        <p className="text-sm text-muted-foreground">
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
          className="rounded-lg border border-border px-4 py-2 text-sm hover:border-accent"
        >
          Exportar CSV
        </button>
        <button
          onClick={handleDownload}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          Descargar favoritas
        </button>
      </div>

      <div
        className="flex flex-wrap gap-3 after:content-[''] after:grow-10"
        style={{ "--target-height": "clamp(120px, 15vw, 250px)" } as React.CSSProperties}
      >
        {selections.map((s, i) => {
          const aspect =
            s.width && s.height ? s.width / s.height : 3 / 2;
          const ratio =
            s.width && s.height ? `${s.width} / ${s.height}` : "3 / 2";
          return (
            <div
              key={s.id}
              className="overflow-hidden rounded-lg border border-border ring-2 ring-accent"
              style={{
                flexGrow: aspect,
                flexBasis: `calc(${aspect} * var(--target-height, 120px))`,
              }}
            >
              <div
                className="cursor-pointer bg-muted"
                style={{ aspectRatio: ratio }}
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
                <p className="truncate text-xs text-muted-foreground">
                  {s.filename}
                </p>
                <a
                  href={`/api/photo/${s.photoId}/download`}
                  download
                  className="shrink-0 ml-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                  </svg>
                </a>
              </div>
            </div>
          );
        })}
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

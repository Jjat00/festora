"use client";

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
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Descargar favoritas
        </button>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {selections.map((s) => (
          <div
            key={s.id}
            className="overflow-hidden rounded-lg border border-[var(--border)] ring-2 ring-[var(--accent)]"
          >
            <div className="aspect-square bg-[var(--muted)]">
              {s.thumbnailKey && (
                <img
                  src={`/api/photo/${s.photoId}/thumbnail`}
                  alt={s.filename}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
            <div className="p-2">
              <p className="truncate text-xs text-[var(--muted-foreground)]">
                {s.filename}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

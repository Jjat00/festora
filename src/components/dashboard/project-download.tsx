"use client";

import {
  DownloadIcon,
  DownloadMessage,
  DownloadProgress,
  useZipDownload,
} from "@/components/download-progress";

export function ProjectDownload({
  projectId,
  projectName,
  totalCount,
}: {
  projectId: string;
  projectName: string;
  totalCount: number;
}) {
  const { state, start, cancel } = useZipDownload();

  if (state.kind === "preparing" || state.kind === "downloading") {
    return (
      <DownloadProgress
        state={state}
        onCancel={cancel}
        className="w-full min-w-[220px] sm:w-auto sm:max-w-[280px]"
      />
    );
  }

  const base = projectName.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "festora";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() =>
          start(`/api/projects/${projectId}/download-manifest?type=all`, {
            label: "todas las fotos",
            suggestedName: `${base}.zip`,
          })
        }
        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-accent"
      >
        {DownloadIcon}
        Descargar todas
        <span className="text-xs text-muted-foreground">({totalCount})</span>
      </button>
      <DownloadMessage state={state} />
    </div>
  );
}

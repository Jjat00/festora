"use client";

import {
  DownloadIcon,
  DownloadProgress,
  useStreamDownload,
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
  const { state, start, cancel } = useStreamDownload();

  if (state.kind === "downloading") {
    return (
      <DownloadProgress
        received={state.received}
        total={state.total}
        label={state.label}
        onCancel={cancel}
        className="w-full min-w-[220px] sm:w-auto sm:max-w-[280px]"
      />
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() =>
          start(`/api/projects/${projectId}/download?type=all`, {
            label: "todas las fotos",
            fallbackFilename: `${projectName || "festora"}.zip`,
          })
        }
        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-accent"
      >
        {DownloadIcon}
        Descargar todas
        <span className="text-xs text-muted-foreground">({totalCount})</span>
      </button>
      {state.kind === "error" && (
        <p className="text-xs text-red-500">{state.message}</p>
      )}
    </div>
  );
}

"use client";

import {
  DownloadIcon,
  DownloadProgress,
  useStreamDownload,
} from "@/components/download-progress";

type Props = {
  slug: string;
  totalCount: number;
  favoritesCount: number;
};

export function GalleryDownload({ slug, totalCount, favoritesCount }: Props) {
  const { state, start, cancel } = useStreamDownload();

  function startDownload(type: "all" | "favorites") {
    start(`/api/g/${slug}/download?type=${type}`, {
      label: type === "favorites" ? "favoritas" : "todas las fotos",
      fallbackFilename: `festora-${type}.zip`,
    });
  }

  if (state.kind === "downloading") {
    return (
      <DownloadProgress
        received={state.received}
        total={state.total}
        label={state.label}
        onCancel={cancel}
        className="w-full max-w-md sm:w-auto sm:min-w-[280px]"
      />
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => startDownload("all")}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          {DownloadIcon}
          Descargar todas
          <span className="text-xs opacity-70">({totalCount})</span>
        </button>
        <button
          type="button"
          onClick={() => startDownload("favorites")}
          disabled={favoritesCount === 0}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background"
          title={favoritesCount === 0 ? "Aún no hay favoritas seleccionadas" : undefined}
        >
          {DownloadIcon}
          Solo favoritas
          <span className="text-xs opacity-70">({favoritesCount})</span>
        </button>
      </div>
      {state.kind === "error" && (
        <p className="text-xs text-red-500">{state.message}</p>
      )}
    </div>
  );
}

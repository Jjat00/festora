"use client";

import { useState } from "react";
import { LlmAnalysisModal } from "@/components/dashboard/llm-analysis-modal";
import { LlmStatusBanner } from "@/components/dashboard/llm-status-banner";

type AnalysisJob = { queued: number; since: string };

/**
 * Renderiza el banner de progreso (encima) + el botón de trigger (abajo).
 * Mantiene el estado del job en curso para mostrar el LlmStatusBanner.
 */
export function LlmAnalysisSection({
  projectId,
  totalPhotos,
  highlightedPhotos,
}: {
  projectId: string;
  totalPhotos: number;
  highlightedPhotos: number;
}) {
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState<AnalysisJob | null>(null);

  function handleSuccess(queued: number) {
    setJob({ queued, since: new Date().toISOString() });
    setOpen(false);
  }

  return (
    <>
      {job && (
        <LlmStatusBanner
          projectId={projectId}
          queued={job.queued}
          since={job.since}
          onComplete={() => setJob(null)}
        />
      )}

      {!job && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Análisis narrativo con IA multimodal
          </p>
          <button
            onClick={() => setOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-foreground hover:bg-muted"
          >
            <span aria-hidden>✦</span>
            Analizar con LLM
          </button>
        </div>
      )}

      {open && (
        <LlmAnalysisModal
          projectId={projectId}
          totalPhotos={totalPhotos}
          highlightedPhotos={highlightedPhotos}
          onClose={() => setOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}

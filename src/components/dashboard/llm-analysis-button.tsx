"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LlmAnalysisModal } from "@/components/dashboard/llm-analysis-modal";

export function LlmAnalysisSection({
  projectId,
  totalPhotos,
  pendingPhotos,
}: {
  projectId: string;
  totalPhotos: number;
  pendingPhotos: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSuccess() {
    setOpen(false);
    // Page reloads → server detects QUEUED → AiStatusBanner appears
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Análisis con IA multimodal
        </p>
        <button
          onClick={() => setOpen(true)}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-foreground hover:bg-muted"
        >
          <span aria-hidden>✦</span>
          Analizar con IA
        </button>
      </div>

      {open && (
        <LlmAnalysisModal
          projectId={projectId}
          totalPhotos={totalPhotos}
          pendingPhotos={pendingPhotos}
          onClose={() => setOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}

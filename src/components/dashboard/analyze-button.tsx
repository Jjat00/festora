"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { triggerProjectAnalysis } from "@/lib/actions/photo-actions";

export function AnalyzeButton({
  projectId,
  pendingCount,
}: {
  projectId: string;
  pendingCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (
      !confirm(
        `¿Analizar ${pendingCount} foto${pendingCount !== 1 ? "s" : ""} con IA?\n\nEl proceso tardará unos minutos. Puedes seguir navegando mientras tanto.`
      )
    )
      return;

    setLoading(true);
    try {
      await triggerProjectAnalysis(projectId);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
          Iniciando…
        </>
      ) : (
        <>
          <span>✦</span>
          Analizar con IA
          <span className="rounded-full bg-accent-foreground/20 px-1.5 py-0.5 text-xs">
            {pendingCount}
          </span>
        </>
      )}
    </button>
  );
}

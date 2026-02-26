"use client";

import { useState } from "react";
import { triggerProjectAnalysis } from "@/lib/actions/photo-actions";

export function LlmAnalysisModal({
  projectId,
  totalPhotos,
  pendingPhotos,
  onClose,
  onSuccess,
}: {
  projectId: string;
  totalPhotos: number;
  pendingPhotos: number;
  onClose: () => void;
  onSuccess?: (queued: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const result = await triggerProjectAnalysis(projectId);
      if (result.queued === 0) {
        setError("No hay fotos pendientes de analizar.");
        return;
      }
      onSuccess?.(result.queued);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Análisis con IA</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              El modelo evaluará calidad, composición, emociones y categoría de cada foto.
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info */}
        <div className="mb-5 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Fotos en el proyecto</span>
            <span className="font-medium">{totalPhotos}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pendientes de analizar</span>
            <span className="font-medium">{pendingPhotos}</span>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-foreground disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleAnalyze}
            disabled={loading || pendingPhotos === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
                Iniciando…
              </>
            ) : (
              <>
                <span aria-hidden>✦</span>
                Analizar{pendingPhotos > 0 ? ` (${pendingPhotos})` : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { triggerLlmAnalysis, type LlmModel, type LlmPhotoFilter } from "@/lib/actions/photo-actions";

const MODELS: { id: LlmModel; label: string; pricePerPhoto: number }[] = [
  { id: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6", pricePerPhoto: 0.006 },
  { id: "openai/gpt-4.1",             label: "GPT-4.1",             pricePerPhoto: 0.008 },
  { id: "gemini/gemini-2.0-flash",    label: "Gemini 2.0 Flash",    pricePerPhoto: 0.001 },
];

const FILTERS: { id: LlmPhotoFilter; label: string; description: string }[] = [
  { id: "highlighted", label: "Solo destacadas (score > 65)", description: "Analiza únicamente las fotos con mejor puntuación técnica." },
  { id: "all",         label: "Todas",                        description: "Analiza todas las fotos del proyecto." },
  { id: "manual",      label: "Selección manual",             description: "Elige manualmente qué fotos analizar." },
];

function formatCost(n: number): string {
  return n < 0.01 ? `< $0.01` : `~$${n.toFixed(2)}`;
}

export function LlmAnalysisModal({
  projectId,
  totalPhotos,
  highlightedPhotos,
  onClose,
  onSuccess,
}: {
  projectId: string;
  totalPhotos: number;
  highlightedPhotos: number;
  onClose: () => void;
  onSuccess?: (queued: number) => void;
}) {
  const [model, setModel] = useState<LlmModel>(MODELS[0].id);
  const [filter, setFilter] = useState<LlmPhotoFilter>("highlighted");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModel = MODELS.find((m) => m.id === model)!;

  const photoCount =
    filter === "highlighted" ? highlightedPhotos :
    filter === "all"         ? totalPhotos : 0;

  const estimatedCost = photoCount * selectedModel.pricePerPhoto;

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const result = await triggerLlmAnalysis(projectId, filter, model);
      if (result.queued === 0) {
        setError("No hay fotos que coincidan con los filtros seleccionados.");
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
            <h2 className="text-lg font-semibold">Análisis con LLM</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              El modelo evaluará composición, poses y calidad narrativa.
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

        {/* Modelo */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium">Modelo</p>
          <div className="flex flex-col gap-2">
            {MODELS.map((m) => (
              <label
                key={m.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                  model === m.id
                    ? "border-foreground bg-muted"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-3.5 w-3.5 rounded-full border-2 transition-colors ${
                      model === m.id ? "border-foreground bg-foreground" : "border-muted-foreground"
                    }`}
                  />
                  <span className="text-sm font-medium">{m.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  ${m.pricePerPhoto.toFixed(3)}/foto
                </span>
                <input
                  type="radio"
                  name="model"
                  value={m.id}
                  checked={model === m.id}
                  onChange={() => setModel(m.id)}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Qué fotos analizar */}
        <div className="mb-5">
          <p className="mb-2 text-sm font-medium">¿Qué fotos analizar?</p>
          <div className="flex flex-col gap-2">
            {FILTERS.map((f) => {
              const count = f.id === "highlighted" ? highlightedPhotos : f.id === "all" ? totalPhotos : null;
              const disabled = f.id === "manual";
              return (
                <label
                  key={f.id}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                    disabled
                      ? "cursor-not-allowed border-border opacity-50"
                      : filter === f.id
                        ? "border-foreground bg-muted"
                        : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="mt-0.5">
                    <div
                      className={`h-3.5 w-3.5 rounded-full border-2 transition-colors ${
                        filter === f.id && !disabled
                          ? "border-foreground bg-foreground"
                          : "border-muted-foreground"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{f.label}</span>
                      {count !== null && (
                        <span className="shrink-0 text-xs text-muted-foreground">{count} fotos</span>
                      )}
                      {disabled && (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Pronto</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{f.description}</p>
                  </div>
                  <input
                    type="radio"
                    name="filter"
                    value={f.id}
                    checked={filter === f.id}
                    disabled={disabled}
                    onChange={() => !disabled && setFilter(f.id)}
                    className="sr-only"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* Estimación de costo */}
        <div className="mb-5 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {photoCount} foto{photoCount !== 1 ? "s" : ""} × ${selectedModel.pricePerPhoto.toFixed(3)}
            </span>
            <span className="font-semibold tabular-nums">{formatCost(estimatedCost)}</span>
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
            disabled={loading || photoCount === 0}
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
                Analizar{photoCount > 0 ? ` (${photoCount})` : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

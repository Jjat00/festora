"use client";

import { useEffect, useState, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { triggerProjectAnalysis } from "@/lib/actions/photo-actions";
import { restartStalledAnalysis } from "@/lib/actions/photo-actions";

type AiStatusResponse = {
  total: number;
  queued: number;
  done: number;
  failed: number;
  pending: number;
  complete: boolean;
};

/** Polls without progress for this many cycles before showing "stalled" UI. */
const STALL_THRESHOLD = 6; // ~18s at 3s polling

export function AiStatusBanner({
  projectId,
  initialQueued,
}: {
  projectId: string;
  initialQueued: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<AiStatusResponse | null>(null);
  const [visible, setVisible] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [stalled, setStalled] = useState(false);

  // Track stall detection
  const lastAnalyzedRef = useRef<number | null>(null);
  const stallCountRef = useRef(0);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-status`);
      if (!res.ok) return;
      const data: AiStatusResponse = await res.json();
      setStatus(data);

      // Analysis finished with no failures — hide banner and refresh
      if (data.complete && data.failed === 0) {
        setVisible(false);
        router.refresh();
        return;
      }

      // Stall detection: if QUEUED > 0 but analyzed count hasn't changed
      if (data.queued > 0) {
        const currentAnalyzed = data.done + data.failed;
        if (lastAnalyzedRef.current !== null && currentAnalyzed === lastAnalyzedRef.current) {
          stallCountRef.current += 1;
          if (stallCountRef.current >= STALL_THRESHOLD) {
            setStalled(true);
          }
        } else {
          stallCountRef.current = 0;
          setStalled(false);
        }
        lastAnalyzedRef.current = currentAnalyzed;
      } else {
        stallCountRef.current = 0;
        setStalled(false);
      }
    } catch {
      // ignore transient network errors
    }
  }, [projectId, router]);

  useEffect(() => {
    if (!visible) return;
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [visible, poll]);

  if (!visible) return null;

  const analyzed = status ? status.done + status.failed : 0;
  const total = status ? status.queued + status.done + status.failed : initialQueued;
  const pct = total > 0 ? Math.round((analyzed / total) * 100) : 0;
  const failed = status?.failed ?? 0;
  const complete = status?.complete ?? false;

  function handleRetry() {
    startTransition(async () => {
      await triggerProjectAnalysis(projectId);
      router.refresh();
    });
  }

  function handleRestartStalled() {
    startTransition(async () => {
      stallCountRef.current = 0;
      setStalled(false);
      lastAnalyzedRef.current = null;
      await restartStalledAnalysis(projectId);
      router.refresh();
    });
  }

  // Completed with failures — show completed state with retry
  if (complete && failed > 0) {
    return (
      <div className="mb-6 rounded-lg border border-border bg-muted px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span className="text-sm text-muted-foreground">
              Análisis completado —{" "}
              <span className="font-medium text-red-500">
                {failed} {failed === 1 ? "foto con error" : "fotos con error"}
              </span>
            </span>
          </div>
          <button
            onClick={handleRetry}
            disabled={isPending}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-foreground hover:bg-muted disabled:opacity-50"
          >
            {isPending ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                Reintentando…
              </>
            ) : (
              <>
                <RetryIcon />
                Reintentar ({failed})
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Stalled — QUEUED photos but no progress for a while
  if (stalled) {
    return (
      <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span className="text-sm text-muted-foreground">
              El análisis parece haberse detenido —{" "}
              <span className="font-medium text-foreground">
                {status?.queued ?? 0} {(status?.queued ?? 0) === 1 ? "foto" : "fotos"} sin procesar
              </span>
            </span>
          </div>
          <button
            onClick={handleRestartStalled}
            disabled={isPending}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-foreground hover:bg-muted disabled:opacity-50"
          >
            {isPending ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                Reiniciando…
              </>
            ) : (
              <>
                <RetryIcon />
                Reiniciar análisis
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Processing — show progress bar
  return (
    <div className="mb-6 rounded-lg border border-border bg-muted px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="text-sm text-muted-foreground">
            Analizando fotos con IA…{" "}
            {status && (
              <span className="font-medium text-foreground">
                {analyzed} de {total}
              </span>
            )}
          </span>
          {failed > 0 && (
            <span className="text-xs text-red-500">{failed} con error</span>
          )}
        </div>
        <span className="shrink-0 text-sm font-medium text-foreground">
          {pct}%
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function RetryIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
    </svg>
  );
}

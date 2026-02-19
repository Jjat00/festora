"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function LlmStatusBanner({
  projectId,
  queued,
  since,
  onComplete,
}: {
  projectId: string;
  queued: number;
  since: string;
  onComplete?: () => void;
}) {
  const router = useRouter();
  const [analyzed, setAnalyzed] = useState(0);
  const [visible, setVisible] = useState(true);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/llm-status?since=${encodeURIComponent(since)}`
      );
      if (!res.ok) return;
      const data: { analyzed: number } = await res.json();
      setAnalyzed(data.analyzed);
      if (data.analyzed >= queued) {
        setVisible(false);
        router.refresh();
        onComplete?.();
      }
    } catch {
      // ignorar errores de red temporales
    }
  }, [projectId, since, queued, router, onComplete]);

  useEffect(() => {
    if (!visible) return;
    poll();
    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, [visible, poll]);

  if (!visible) return null;

  const pct = queued > 0 ? Math.round((analyzed / queued) * 100) : 0;

  return (
    <div className="mb-6 rounded-lg border border-border bg-muted px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="text-sm text-muted-foreground">
            Analizando con LLM…{" "}
            <span className="font-medium text-foreground">
              {analyzed} de {queued}
            </span>
          </span>
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

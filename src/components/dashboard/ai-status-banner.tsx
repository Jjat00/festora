"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type AiStatusResponse = {
  total: number;
  processing: number;
  done: number;
  failed: number;
  complete: boolean;
};

export function AiStatusBanner({
  projectId,
  initialProcessing,
}: {
  projectId: string;
  initialProcessing: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<AiStatusResponse | null>(null);
  const [visible, setVisible] = useState(initialProcessing > 0);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-status`);
      if (!res.ok) return;
      const data: AiStatusResponse = await res.json();
      setStatus(data);
      if (data.complete) {
        setVisible(false);
        router.refresh();
      }
    } catch {
      // ignorar errores de red temporales
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
  const total = status ? status.total : initialProcessing;
  const pct = total > 0 ? Math.round((analyzed / total) * 100) : 0;
  const failed = status?.failed ?? 0;

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

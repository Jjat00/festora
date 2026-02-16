"use client";

import { useState } from "react";

export function CopyGalleryLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="rounded-lg border border-[var(--border)] p-4 text-left transition-colors hover:border-[var(--accent)] w-full"
    >
      <p className="text-sm text-[var(--muted-foreground)]">Link de galería</p>
      <p className="truncate text-sm font-mono">{url}</p>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
        {copied ? "✓ Copiado" : "Toca para copiar"}
      </p>
    </button>
  );
}

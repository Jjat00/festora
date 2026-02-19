"use client";

import { useState } from "react";

export function CopyGalleryLink({
  url,
  compact = false,
}: {
  url: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        {copied ? "✓ Copiado" : "Copiar link"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-lg border border-border p-4 text-left transition-colors hover:border-accent w-full"
    >
      <p className="text-sm text-muted-foreground">Link de galería</p>
      <p className="truncate text-sm font-mono">{url}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {copied ? "✓ Copiado" : "Toca para copiar"}
      </p>
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

export function StorageBar({
  used,
  limit,
}: {
  used: number;
  limit: number;
}) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const barColor =
    percentage > 95
      ? "bg-red-500"
      : percentage > 80
        ? "bg-amber-500"
        : "bg-foreground";

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatBytes(used)} de {formatBytes(limit)}
      </span>
    </div>
  );
}

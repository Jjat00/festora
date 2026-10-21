/**
 * Nombre de archivo apto para un ZIP y un Content-Disposition: sin rutas, sin
 * segmentos relativos ni caracteres de control. Las fotos de invitados traen
 * nombres arbitrarios, y las filas viejas se sanean igual al descargarlas.
 */
export function safeFilename(name: string, fallback = "foto.jpg"): string {
  const base = String(name ?? "")
    .split(/[\\/]/)
    .pop()!
    .replace(/[\u0000-\u001f\u007f"<>|:*?]/g, "")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 120);
  return base || fallback;
}

export function contentDispositionAttachment(name: string): string {
  const safe = safeFilename(name);
  const ascii = safe.replace(/[^\x20-\x7e]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

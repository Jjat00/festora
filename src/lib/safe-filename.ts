/**
 * Nombre de archivo apto para un ZIP y un Content-Disposition: sin rutas, sin
 * segmentos relativos ni caracteres de control. Las fotos de invitados traen
 * nombres arbitrarios, y las filas viejas se sanean igual al descargarlas.
 */
export function safeFilename(name: string, fallback = "foto.jpg"): string {
  const cleaned = String(name ?? "")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "") // sustitutos sueltos
    .split(/[\\/]/)
    .pop()!
    .replace(/[\u0000-\u001f\u007f"<>|:*?]/g, "")
    .replace(/^\.+/, "")
    .trim();
  // Cortar por caracteres, no por unidades UTF-16: así un emoji no queda partido
  const base = Array.from(cleaned).slice(0, 120).join("").trim();
  return base || fallback;
}

export function contentDispositionAttachment(name: string): string {
  const safe = safeFilename(name);
  const ascii = safe.replace(/[^\x20-\x7e]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

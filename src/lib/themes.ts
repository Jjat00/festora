// Estilos de la galería pública. "default" es la galería oscura de siempre;
// los demás visten la galería para un evento (ver [data-theme] en globals.css).
export const GALLERY_THEMES = [
  { id: "default", label: "Festora (clásico)" },
  { id: "salvia", label: "Salvia · boda (verde y crema, flores)" },
] as const;

export type GalleryTheme = (typeof GALLERY_THEMES)[number]["id"];

export function toGalleryTheme(value: string | null | undefined): GalleryTheme {
  return GALLERY_THEMES.some((t) => t.id === value) ? (value as GalleryTheme) : "default";
}

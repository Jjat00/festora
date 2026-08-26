import type { Metadata } from "next";

/**
 * Las galerias son privadas: no deben indexarse ni guardarse en cache de
 * buscadores aunque alguien pegue el enlace en un sitio publico.
 * `robots.txt` ya las excluye; esto cubre el caso de un enlace entrante.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

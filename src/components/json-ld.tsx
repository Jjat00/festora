/**
 * Inserta un bloque `application/ld+json`. Los datos salen siempre de los
 * diccionarios del repo, nunca de contenido subido por un usuario.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

import { getSignedReadUrl } from "@/lib/r2";
import { safeFilename } from "@/lib/safe-filename";

/**
 * Vigencia de las URLs prefirmadas del manifiesto. Un proyecto de varios GB
 * puede tardar horas en una conexión lenta y el ZIP se arma en el navegador,
 * así que las URLs tienen que sobrevivir a toda la descarga.
 */
const MANIFEST_URL_TTL_SECONDS = 6 * 60 * 60;

export type ManifestFile = {
  id: string;
  /** Nombre dentro del ZIP, ya deduplicado. */
  name: string;
  size: number;
  /** URL prefirmada de R2: el navegador lee el original sin pasar por el servidor. */
  url: string;
};

export type DownloadManifest = {
  zipName: string;
  totalSize: number;
  files: ManifestFile[];
};

type PhotoRow = {
  id: string;
  objectKey: string;
  originalFilename: string;
  size: number;
};

export function safeProjectName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "festora";
}

/**
 * Convierte las fotos en un manifiesto que el cliente puede consumir para
 * armar el ZIP por su cuenta. Los nombres se deduplican aquí porque en el ZIP
 * dos entradas con el mismo nombre son un archivo corrupto.
 */
export async function buildDownloadManifest(
  photos: PhotoRow[],
  zipName: string
): Promise<DownloadManifest> {
  // Se reservan todos los nombres emitidos, también los que genera el sufijo:
  // "a?.jpg" y "a.jpg" sanean igual, y "a (1).jpg" puede existir de antes.
  const emitted = new Set<string>();
  function uniqueName(name: string): string {
    const key = (n: string) => n.toLowerCase();
    if (!emitted.has(key(name))) {
      emitted.add(key(name));
      return name;
    }
    const dot = name.lastIndexOf(".");
    const stem = dot === -1 ? name : name.slice(0, dot);
    const ext = dot === -1 ? "" : name.slice(dot);
    for (let n = 1; ; n++) {
      const candidate = `${stem} (${n})${ext}`;
      if (!emitted.has(key(candidate))) {
        emitted.add(key(candidate));
        return candidate;
      }
    }
  }

  const files = await Promise.all(
    photos.map(async (photo) => ({
      id: photo.id,
      name: uniqueName(safeFilename(photo.originalFilename)),
      size: photo.size,
      url: await getSignedReadUrl(photo.objectKey, MANIFEST_URL_TTL_SECONDS),
    }))
  );

  return {
    zipName,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    files,
  };
}
